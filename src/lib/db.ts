// Database client using Prisma with PostgreSQL (Neon)
//
// IMPORTANT (deploy fix): This module MUST expose `db` and `prisma` as static
// named exports at the top level. The previous version used
// `__non_webpack_require__` + `require('fs')` inside an `ensureEnvLoaded()`
// helper, which prevented Turbopack from statically analyzing the module and
// caused the build to abort with `Error: Export db doesn't exist in target
// module` across 235+ routes.
//
// The env-loading logic has been removed — Next.js loads `.env` automatically
// in both dev and production (standalone) builds, and on LipeHost the
// `DATABASE_URL` is injected via the PM2 ecosystem file. We now rely solely
// on `process.env.DATABASE_URL`.
//
// The `db` object below is a COMPATIBILITY WRAPPER that maps the project's
// SQL-style calls (`db.findOne('User', '"email" = $1', [email])`) to the
// matching Prisma client methods. 59 route files depend on this wrapper, so
// it must stay. Direct Prisma access is also available via `prisma`.
import { PrismaClient } from '@prisma/client'

// Singleton cache on globalThis to avoid spawning a new PrismaClient on every
// hot-reload during development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Get or create Prisma client (singleton). No dynamic requires, no fs reads —
// fully statically analyzable by Turbopack.
//
// IMPORTANT (deploy fix): The previous version had a hardcoded
// `FALLBACK_NEON_URL` constant + a `resolveDatabaseUrl()` helper that silently
// connected to an external Neon database when `DATABASE_URL` was missing. This
// masked configuration bugs in production. The fallback has been REMOVED —
// Prisma now reads `process.env.DATABASE_URL` directly. If the env var is not
// set, Prisma throws a clear error (which is the desired behavior).
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

// Initialize eagerly so the very first DB call doesn't pay the connect cost.
export const prisma = getPrisma()

// Comprehensive db interface that maps common query patterns to Prisma calls
export const db = {
  async execute(query: string, params: any[] = []): Promise<any[]> {
    throw new Error('Raw SQL execute is not supported with Prisma. Use Prisma client methods instead.')
  },

  async findOne(table: string, conditions: string, params: any[] = []): Promise<any | null> {
    try {
      // User lookups
      if (table === 'User') {
        if (conditions.includes('"email"')) {
          return prisma.user.findUnique({ where: { email: params[0] } }) as any
        }
        if (conditions.includes('"cpf"')) {
          return prisma.user.findUnique({ where: { cpf: params[0] } }) as any
        }
        if (conditions.includes('"id"')) {
          return prisma.user.findUnique({ where: { id: params[0] } }) as any
        }
        if (conditions.includes('"referralCode"')) {
          return prisma.user.findUnique({ where: { referralCode: params[0] } }) as any
        }
        if (conditions.includes('"username"')) {
          return prisma.user.findUnique({ where: { username: params[0] } }) as any
        }
        // Compound conditions for User
        if (conditions.includes('"referredById"') && conditions.includes('"isActive"')) {
          return prisma.user.findFirst({ where: { referredById: params[0], isActive: params[1] } }) as any
        }
        // Fallback: findFirst with parsed conditions
        return prisma.user.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // MatrixPosition lookups
      if (table === 'MatrixPosition') {
        if (conditions.includes('"userId"') && conditions.includes('"matrixType"')) {
          return prisma.matrixPosition.findFirst({ where: { userId: params[0], matrixType: params[1] } }) as any
        }
        if (conditions.includes('"id"')) {
          return prisma.matrixPosition.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.matrixPosition.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // SystemConfig lookups
      if (table === 'SystemConfig') {
        if (conditions.includes('"key"')) {
          return prisma.systemConfig.findUnique({ where: { key: params[0] } }) as any
        }
        if (conditions.includes('"id"')) {
          return prisma.systemConfig.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.systemConfig.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Ticket lookups
      if (table === 'Ticket') {
        if (conditions.includes('"id"')) {
          return prisma.ticket.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.ticket.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Invoice lookups
      if (table === 'Invoice') {
        if (conditions.includes('"id"')) {
          return prisma.invoice.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.invoice.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Gratification lookups
      if (table === 'Gratification') {
        if (conditions.includes('"id"')) {
          return prisma.gratification.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.gratification.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // GamificationStreak lookups
      if (table === 'GamificationStreak') {
        if (conditions.includes('"userId"')) {
          return prisma.gamificationStreak.findUnique({ where: { userId: params[0] } }) as any
        }
        if (conditions.includes('"id"')) {
          return prisma.gamificationStreak.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.gamificationStreak.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // EventRegistration lookups
      if (table === 'EventRegistration') {
        if (conditions.includes('"eventId"') && conditions.includes('"userId"')) {
          return prisma.eventRegistration.findUnique({ where: { eventId_userId: { eventId: params[0], userId: params[1] } } }) as any
        }
        if (conditions.includes('"id"')) {
          return prisma.eventRegistration.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.eventRegistration.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Event lookups
      if (table === 'Event') {
        if (conditions.includes('"id"')) {
          return prisma.event.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.event.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Beneficiary lookups
      if (table === 'Beneficiary') {
        if (conditions.includes('"id"')) {
          return prisma.beneficiary.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.beneficiary.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // MarketplaceProduct lookups
      if (table === 'MarketplaceProduct') {
        if (conditions.includes('"id"')) {
          return prisma.marketplaceProduct.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.marketplaceProduct.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // MarketplaceOrder lookups
      if (table === 'MarketplaceOrder') {
        if (conditions.includes('"id"')) {
          return prisma.marketplaceOrder.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.marketplaceOrder.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Bet lookups
      if (table === 'Bet') {
        if (conditions.includes('"id"')) {
          return prisma.bet.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.bet.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Voucher lookups
      if (table === 'Voucher') {
        if (conditions.includes('"id"')) {
          return prisma.voucher.findUnique({ where: { id: params[0] } }) as any
        }
        if (conditions.includes('"code"')) {
          return prisma.voucher.findUnique({ where: { code: params[0] } }) as any
        }
        return prisma.voucher.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Notification lookups
      if (table === 'Notification') {
        if (conditions.includes('"id"')) {
          return prisma.notification.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.notification.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Transaction lookups
      if (table === 'Transaction') {
        if (conditions.includes('"id"')) {
          return prisma.transaction.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.transaction.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // CareerMilestone lookups
      if (table === 'CareerMilestone') {
        if (conditions.includes('"id"')) {
          return prisma.careerMilestone.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.careerMilestone.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Announcement lookups
      if (table === 'Announcement') {
        if (conditions.includes('"id"')) {
          return prisma.announcement.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.announcement.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // Challenge lookups
      if (table === 'Challenge') {
        if (conditions.includes('"id"')) {
          return prisma.challenge.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.challenge.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // UserChallenge lookups
      if (table === 'UserChallenge') {
        if (conditions.includes('"id"')) {
          return prisma.userChallenge.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.userChallenge.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // CashbackEntry lookups
      if (table === 'CashbackEntry') {
        if (conditions.includes('"id"')) {
          return prisma.cashbackEntry.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.cashbackEntry.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // CashbackResidual lookups
      if (table === 'CashbackResidual') {
        if (conditions.includes('"id"')) {
          return prisma.cashbackResidual.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.cashbackResidual.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // CashbackSales lookups
      if (table === 'CashbackSales') {
        if (conditions.includes('"id"')) {
          return prisma.cashbackSales.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.cashbackSales.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      // PointTransaction lookups
      if (table === 'PointTransaction') {
        if (conditions.includes('"id"')) {
          return prisma.pointTransaction.findUnique({ where: { id: params[0] } }) as any
        }
        return prisma.pointTransaction.findFirst({ where: parseConditions(conditions, params) }) as any
      }

      console.warn(`[db.findOne] Using fallback for table=${table} conditions=${conditions}`)
      return null
    } catch (err) {
      console.error(`[db.findOne] Error for table=${table} conditions=${conditions}:`, err)
      return null
    }
  },

  async find(table: string, conditions: string = '', params: any[] = [], extra: string = ''): Promise<any[]> {
    try {
      const where = conditions ? parseConditions(conditions, params) : {}
      const orderBy = parseOrderBy(extra)
      const limit = parseLimit(extra)

      const queryOptions: any = { where }
      if (orderBy) queryOptions.orderBy = orderBy
      if (limit) queryOptions.take = limit

      // Route to correct Prisma model
      switch (table) {
        case 'User':
          return prisma.user.findMany(queryOptions) as any
        case 'Transaction':
          return prisma.transaction.findMany(queryOptions) as any
        case 'Notification':
          return prisma.notification.findMany(queryOptions) as any
        case 'Gratification':
          return prisma.gratification.findMany(queryOptions) as any
        case 'CashbackEntry':
          return prisma.cashbackEntry.findMany(queryOptions) as any
        case 'CashbackResidual':
          return prisma.cashbackResidual.findMany(queryOptions) as any
        case 'CashbackSales':
          return prisma.cashbackSales.findMany(queryOptions) as any
        case 'Ticket':
          return prisma.ticket.findMany(queryOptions) as any
        case 'TicketMessage':
          return prisma.ticketMessage.findMany(queryOptions) as any
        case 'Voucher':
          return prisma.voucher.findMany(queryOptions) as any
        case 'Invoice':
          return prisma.invoice.findMany(queryOptions) as any
        case 'CareerMilestone':
          return prisma.careerMilestone.findMany(queryOptions) as any
        case 'SystemConfig':
          return prisma.systemConfig.findMany(queryOptions) as any
        case 'Announcement':
          return prisma.announcement.findMany(queryOptions) as any
        case 'MatrixPosition':
          return prisma.matrixPosition.findMany(queryOptions) as any
        case 'GamificationStreak':
          return prisma.gamificationStreak.findMany(queryOptions) as any
        case 'Challenge':
          return prisma.challenge.findMany(queryOptions) as any
        case 'UserChallenge':
          return prisma.userChallenge.findMany(queryOptions) as any
        case 'Event':
          return prisma.event.findMany(queryOptions) as any
        case 'EventRegistration':
          return prisma.eventRegistration.findMany(queryOptions) as any
        case 'Beneficiary':
          return prisma.beneficiary.findMany(queryOptions) as any
        case 'MarketplaceProduct':
          return prisma.marketplaceProduct.findMany(queryOptions) as any
        case 'MarketplaceOrder':
          return prisma.marketplaceOrder.findMany(queryOptions) as any
        case 'MarketplaceOrderItem':
          return prisma.marketplaceOrderItem.findMany(queryOptions) as any
        case 'PointTransaction':
          return prisma.pointTransaction.findMany(queryOptions) as any
        case 'Bet':
          return prisma.bet.findMany(queryOptions) as any
        default:
          console.warn(`[db.find] Unknown table: ${table}`)
          return []
      }
    } catch (err) {
      console.error(`[db.find] Error for table=${table}:`, err)
      return []
    }
  },

  async insert(table: string, data: Record<string, any>): Promise<any> {
    switch (table) {
      case 'User':
        return prisma.user.create({ data }) as any
      case 'Transaction':
        return prisma.transaction.create({ data }) as any
      case 'Ticket':
        return prisma.ticket.create({ data }) as any
      case 'TicketMessage':
        return prisma.ticketMessage.create({ data }) as any
      case 'Notification':
        return prisma.notification.create({ data }) as any
      case 'CashbackEntry':
        return prisma.cashbackEntry.create({ data }) as any
      case 'CashbackResidual':
        return prisma.cashbackResidual.create({ data }) as any
      case 'CashbackSales':
        return prisma.cashbackSales.create({ data }) as any
      case 'Gratification':
        return prisma.gratification.create({ data }) as any
      case 'Voucher':
        return prisma.voucher.create({ data }) as any
      case 'CareerMilestone':
        return prisma.careerMilestone.create({ data }) as any
      case 'MatrixPosition':
        return prisma.matrixPosition.create({ data }) as any
      case 'PointTransaction':
        return prisma.pointTransaction.create({ data }) as any
      case 'Invoice':
        return prisma.invoice.create({ data }) as any
      case 'SystemConfig':
        return prisma.systemConfig.create({ data }) as any
      case 'GamificationStreak':
        return prisma.gamificationStreak.create({ data }) as any
      case 'UserChallenge':
        return prisma.userChallenge.create({ data }) as any
      case 'Challenge':
        return prisma.challenge.create({ data }) as any
      case 'Event':
        return prisma.event.create({ data }) as any
      case 'EventRegistration':
        return prisma.eventRegistration.create({ data }) as any
      case 'Beneficiary':
        return prisma.beneficiary.create({ data }) as any
      case 'MarketplaceProduct':
        return prisma.marketplaceProduct.create({ data }) as any
      case 'MarketplaceOrder':
        return prisma.marketplaceOrder.create({ data }) as any
      case 'MarketplaceOrderItem':
        return prisma.marketplaceOrderItem.create({ data }) as any
      case 'Announcement':
        return prisma.announcement.create({ data }) as any
      case 'Bet':
        return prisma.bet.create({ data }) as any
      default:
        throw new Error(`insert not implemented for table=${table}`)
    }
  },

  async update(table: string, conditions: string, data: Record<string, any>, conditionParams: any[] = []): Promise<any> {
    try {
      // User updates
      if (table === 'User') {
        if (conditions.includes('"id"')) {
          return prisma.user.update({ where: { id: conditionParams[0] }, data }) as any
        }
        if (conditions.includes('"email"')) {
          return prisma.user.update({ where: { email: conditionParams[0] }, data }) as any
        }
      }

      // Gratification updates
      if (table === 'Gratification') {
        if (conditions.includes('"id"')) {
          return prisma.gratification.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Transaction updates
      if (table === 'Transaction') {
        if (conditions.includes('"id"')) {
          return prisma.transaction.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Ticket updates
      if (table === 'Ticket') {
        if (conditions.includes('"id"')) {
          return prisma.ticket.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Notification updates
      if (table === 'Notification') {
        if (conditions.includes('"id"')) {
          return prisma.notification.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Voucher updates
      if (table === 'Voucher') {
        if (conditions.includes('"id"')) {
          return prisma.voucher.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // SystemConfig updates
      if (table === 'SystemConfig') {
        if (conditions.includes('"key"')) {
          return prisma.systemConfig.update({ where: { key: conditionParams[0] }, data }) as any
        }
        if (conditions.includes('"id"')) {
          return prisma.systemConfig.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // GamificationStreak updates
      if (table === 'GamificationStreak') {
        if (conditions.includes('"userId"')) {
          return prisma.gamificationStreak.update({ where: { userId: conditionParams[0] }, data }) as any
        }
        if (conditions.includes('"id"')) {
          return prisma.gamificationStreak.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // UserChallenge updates
      if (table === 'UserChallenge') {
        if (conditions.includes('"id"')) {
          return prisma.userChallenge.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // MarketplaceProduct updates
      if (table === 'MarketplaceProduct') {
        if (conditions.includes('"id"')) {
          return prisma.marketplaceProduct.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // MarketplaceOrder updates
      if (table === 'MarketplaceOrder') {
        if (conditions.includes('"id"')) {
          return prisma.marketplaceOrder.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Invoice updates
      if (table === 'Invoice') {
        if (conditions.includes('"id"')) {
          return prisma.invoice.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Beneficiary updates
      if (table === 'Beneficiary') {
        if (conditions.includes('"id"')) {
          return prisma.beneficiary.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Event updates
      if (table === 'Event') {
        if (conditions.includes('"id"')) {
          return prisma.event.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Challenge updates
      if (table === 'Challenge') {
        if (conditions.includes('"id"')) {
          return prisma.challenge.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Announcement updates
      if (table === 'Announcement') {
        if (conditions.includes('"id"')) {
          return prisma.announcement.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // Bet updates
      if (table === 'Bet') {
        if (conditions.includes('"id"')) {
          return prisma.bet.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      // TicketMessage updates
      if (table === 'TicketMessage') {
        if (conditions.includes('"id"')) {
          return prisma.ticketMessage.update({ where: { id: conditionParams[0] }, data }) as any
        }
      }

      throw new Error(`update not implemented for table=${table} conditions=${conditions}`)
    } catch (err) {
      console.error(`[db.update] Error for table=${table} conditions=${conditions}:`, err)
      throw err
    }
  },

  async deleteFrom(table: string, conditions: string, params: any[] = []): Promise<any> {
    try {
      if (conditions.includes('"id"')) {
        switch (table) {
          case 'Notification':
            return prisma.notification.delete({ where: { id: params[0] } }) as any
          case 'MarketplaceProduct':
            return prisma.marketplaceProduct.delete({ where: { id: params[0] } }) as any
          case 'MarketplaceOrder':
            return prisma.marketplaceOrder.delete({ where: { id: params[0] } }) as any
          case 'Beneficiary':
            return prisma.beneficiary.delete({ where: { id: params[0] } }) as any
          case 'Ticket':
            return prisma.ticket.delete({ where: { id: params[0] } }) as any
          case 'TicketMessage':
            return prisma.ticketMessage.delete({ where: { id: params[0] } }) as any
          case 'Event':
            return prisma.event.delete({ where: { id: params[0] } }) as any
          case 'EventRegistration':
            return prisma.eventRegistration.delete({ where: { id: params[0] } }) as any
          case 'Announcement':
            return prisma.announcement.delete({ where: { id: params[0] } }) as any
          case 'Challenge':
            return prisma.challenge.delete({ where: { id: params[0] } }) as any
          case 'Voucher':
            return prisma.voucher.delete({ where: { id: params[0] } }) as any
          case 'Bet':
            return prisma.bet.delete({ where: { id: params[0] } }) as any
          case 'SystemConfig':
            return prisma.systemConfig.delete({ where: { id: params[0] } }) as any
          default:
            throw new Error(`deleteFrom not implemented for table=${table}`)
        }
      }

      // Handle SystemConfig delete by key
      if (table === 'SystemConfig' && conditions.includes('"key"')) {
        return prisma.systemConfig.deleteMany({ where: { key: params[0] } }) as any
      }

      // Handle EventRegistration with compound unique
      if (table === 'EventRegistration' && conditions.includes('"eventId"') && conditions.includes('"userId"')) {
        return prisma.eventRegistration.delete({ where: { eventId_userId: { eventId: params[0], userId: params[1] } } }) as any
      }

      throw new Error(`deleteFrom not implemented for table=${table} conditions=${conditions}`)
    } catch (err) {
      console.error(`[db.deleteFrom] Error for table=${table}:`, err)
      throw err
    }
  },

  async count(table: string, conditions: string = '', params: any[] = []): Promise<number> {
    try {
      const where = conditions ? parseConditions(conditions, params) : {}

      switch (table) {
        case 'User':
          return prisma.user.count({ where })
        case 'Transaction':
          return prisma.transaction.count({ where })
        case 'Notification':
          return prisma.notification.count({ where })
        case 'Gratification':
          return prisma.gratification.count({ where })
        case 'MatrixPosition':
          return prisma.matrixPosition.count({ where })
        case 'Ticket':
          return prisma.ticket.count({ where })
        case 'Voucher':
          return prisma.voucher.count({ where })
        case 'CashbackEntry':
          return prisma.cashbackEntry.count({ where })
        case 'CashbackResidual':
          return prisma.cashbackResidual.count({ where })
        case 'CashbackSales':
          return prisma.cashbackSales.count({ where })
        case 'Invoice':
          return prisma.invoice.count({ where })
        case 'CareerMilestone':
          return prisma.careerMilestone.count({ where })
        case 'SystemConfig':
          return prisma.systemConfig.count({ where })
        case 'Announcement':
          return prisma.announcement.count({ where })
        case 'GamificationStreak':
          return prisma.gamificationStreak.count({ where })
        case 'Challenge':
          return prisma.challenge.count({ where })
        case 'UserChallenge':
          return prisma.userChallenge.count({ where })
        case 'Event':
          return prisma.event.count({ where })
        case 'EventRegistration':
          return prisma.eventRegistration.count({ where })
        case 'Beneficiary':
          return prisma.beneficiary.count({ where })
        case 'MarketplaceProduct':
          return prisma.marketplaceProduct.count({ where })
        case 'MarketplaceOrder':
          return prisma.marketplaceOrder.count({ where })
        case 'MarketplaceOrderItem':
          return prisma.marketplaceOrderItem.count({ where })
        case 'PointTransaction':
          return prisma.pointTransaction.count({ where })
        case 'Bet':
          return prisma.bet.count({ where })
        default:
          console.warn(`[db.count] Unknown table: ${table}`)
          return 0
      }
    } catch (err) {
      console.error(`[db.count] Error for table=${table}:`, err)
      return 0
    }
  },
}

// Helper: Parse SQL-style conditions like '"userId" = $1 AND "isRead" = false' into Prisma where object
function parseConditions(conditions: string, params: any[]): Record<string, any> {
  if (!conditions) return {}

  const where: Record<string, any> = {}
  const parts = conditions.split(/\s+AND\s+/i)

  for (const part of parts) {
    // Match parameter references like "field" = $1
    const paramMatch = part.match(/"(\w+)"\s*(=|!=|>|<|>=|<=|LIKE|IN)\s*\$(\d+)/i)
    if (paramMatch) {
      const [, field, operator, paramIdxStr] = paramMatch
      const paramIdx = parseInt(paramIdxStr) - 1
      const value = params[paramIdx]

      switch (operator.toUpperCase()) {
        case '=':
          where[field] = value
          break
        case '!=':
          where[field] = { not: value }
          break
        case '>':
          where[field] = { gt: value }
          break
        case '<':
          where[field] = { lt: value }
          break
        case '>=':
          where[field] = { gte: value }
          break
        case '<=':
          where[field] = { lte: value }
          break
        case 'LIKE':
          where[field] = { contains: String(value).replace(/%/g, ''), mode: 'insensitive' }
          break
        case 'IN':
          where[field] = { in: Array.isArray(value) ? value : [value] }
          break
      }
      continue
    }

    // Match literal boolean values like "isRead" = false or "isActive" = true
    const boolMatch = part.match(/"(\w+)"\s*(=|!=)\s*(true|false)/i)
    if (boolMatch) {
      const [, field, operator, literal] = boolMatch
      const value = literal.toLowerCase() === 'true'
      if (operator === '=') {
        where[field] = value
      } else {
        where[field] = { not: value }
      }
      continue
    }
  }

  return where
}

// Helper: Parse ORDER BY from extra string like 'ORDER BY "createdAt" DESC LIMIT 50'
function parseOrderBy(extra: string): Record<string, string> | null {
  const match = extra.match(/ORDER\s+BY\s+"(\w+)"\s+(ASC|DESC)/i)
  if (!match) return null
  return { [match[1]]: match[2].toLowerCase() }
}

// Helper: Parse LIMIT from extra string
function parseLimit(extra: string): number | null {
  const match = extra.match(/LIMIT\s+(\d+)/i)
  if (!match) return null
  return parseInt(match[1])
}
