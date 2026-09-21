import { prisma } from '@/lib/db'

/**
 * Canonical TalkMobi plan catalogue (Task 16-C).
 *
 * These four SKUs match the public TalkMobi marketing page. Prices are
 * stored in centavos so we can use integer math everywhere; the API
 * formats them as BRL strings before sending to the client.
 *
 * The `id` is a stable, human-readable slug so re-running the seed is
 * idempotent (the upsert won't create duplicates) and admins can
 * reference plans by a predictable key in invoices/subscriptions.
 */
export const DEFAULT_TALKMOBI_PLANS = [
  {
    id: 'talkmobi-10gb',
    name: 'Plano 10 GB',
    dataAmount: '10 GB',
    priceCents: 2990,
    cashbackCents: 0,
    rewardPoints: 0,
    description: 'Plano ideal para quem usa o celular para mensagens e redes sociais no dia a dia.',
    features: [
      '10 GB de internet',
      'Ligações ilimitadas',
      'SMS ilimitado',
      'App TalkMobi',
    ],
    isPopular: false,
    isRecommended: false,
    sortOrder: 1,
  },
  {
    id: 'talkmobi-20gb',
    name: 'Plano 20 GB',
    dataAmount: '20 GB',
    priceCents: 3990,
    cashbackCents: 0,
    rewardPoints: 0,
    description: 'Mais internet para quem consome vídeos e navega bastante.',
    features: [
      '20 GB de internet',
      'Ligações ilimitadas',
      'SMS ilimitado',
      'App TalkMobi',
      'Roaming nacional',
    ],
    isPopular: true,
    isRecommended: false,
    sortOrder: 2,
  },
  {
    id: 'talkmobi-50gb',
    name: 'Plano 50 GB',
    dataAmount: '50 GB',
    priceCents: 5990,
    cashbackCents: 0,
    rewardPoints: 0,
    description: 'Para quem precisa de muito volume de dados e prioridade no 5G.',
    features: [
      '50 GB de internet',
      'Ligações ilimitadas',
      'SMS ilimitado',
      'App TalkMobi',
      'Roaming nacional',
      '5G prioritário',
    ],
    isPopular: false,
    isRecommended: true,
    sortOrder: 3,
  },
  {
    id: 'talkmobi-ilimitado',
    name: 'Plano Ilimitado',
    dataAmount: 'Ilimitado',
    priceCents: 9990,
    cashbackCents: 0,
    rewardPoints: 0,
    description: 'O plano mais completo: internet ilimitada, roaming internacional e telemedicina inclusa.',
    features: [
      'Internet ilimitada',
      'Ligações ilimitadas',
      'SMS ilimitado',
      'App TalkMobi',
      'Roaming nacional/internacional',
      '5G prioritário',
      'Telemedicina inclusa',
    ],
    isPopular: false,
    isRecommended: false,
    sortOrder: 4,
  },
] as const

/**
 * Inserts the four canonical TalkMobi plans if none exist yet.
 *
 * Idempotent: uses `upsert` keyed on the stable slug `id`, so re-running
 * the seed (or running it from multiple workers) never creates duplicate
 * rows. Existing plans are NOT overwritten — if an admin has changed a
 * price in the backoffice, the seed will leave it alone.
 *
 * @returns the count of plans that exist after the seed runs.
 */
export async function seedTalkMobiPlansIfEmpty(): Promise<number> {
  const existing = await prisma.talkMobiPlan.count()
  if (existing > 0) return existing

  for (const plan of DEFAULT_TALKMOBI_PLANS) {
    await prisma.talkMobiPlan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        name: plan.name,
        dataAmount: plan.dataAmount,
        priceCents: plan.priceCents,
        cashbackCents: plan.cashbackCents,
        rewardPoints: plan.rewardPoints,
        description: plan.description,
        features: JSON.stringify(plan.features),
        isPopular: plan.isPopular,
        isRecommended: plan.isRecommended,
        isActive: true,
        sortOrder: plan.sortOrder,
      },
      update: {},
    })
  }

  return prisma.talkMobiPlan.count()
}

/**
 * Force-seed: wipes the TalkMobiPlan table and inserts the four canonical
 * plans. Use this when the DB has stale/incorrect plans from a previous
 * seed and you need to reset to the canonical marketing catalogue.
 *
 * The TalkMobiPlan table has no inbound FKs (it's a pure marketing table
 * — the "Assinar" button on the page only shows a toast), so a hard
 * delete is safe and won't orphane any invoices/subscriptions.
 *
 * @returns the count of plans after the reset (always 4 on success).
 */
export async function seedTalkMobiPlansForce(): Promise<number> {
  await prisma.talkMobiPlan.deleteMany({})
  for (const plan of DEFAULT_TALKMOBI_PLANS) {
    await prisma.talkMobiPlan.create({
      data: {
        id: plan.id,
        name: plan.name,
        dataAmount: plan.dataAmount,
        priceCents: plan.priceCents,
        cashbackCents: plan.cashbackCents,
        rewardPoints: plan.rewardPoints,
        description: plan.description,
        features: JSON.stringify(plan.features),
        isPopular: plan.isPopular,
        isRecommended: plan.isRecommended,
        isActive: true,
        sortOrder: plan.sortOrder,
      },
    })
  }
  return prisma.talkMobiPlan.count()
}

/**
 * Standalone entry-point so this file can be executed directly with
 *   bun run src/lib/seed-talkmobi.ts
 * or
 *   bunx tsx src/lib/seed-talkmobi.ts
 *
 * Guarded by an "is main module" check so importing the module from the
 * API never accidentally triggers a seed run. Supports both Bun
 * (`import.meta.main`) and Node/tsx (`import.meta.url === pathToFileURL(argv[1])`).
 */
const isMainModule =
  typeof (import.meta as { main?: boolean }).main === 'boolean'
    ? (import.meta as { main: boolean }).main
    : import.meta.url ===
      (typeof process !== 'undefined' && process.argv[1]
        ? `file://${process.argv[1]}`
        : '')

if (isMainModule) {
  void (async () => {
    try {
      const count = await seedTalkMobiPlansIfEmpty()
      console.log(`TalkMobi seed OK — ${count} plan(s) in DB.`)
    } catch (err) {
      console.error('TalkMobi seed failed:', err)
      process.exitCode = 1
    } finally {
      await prisma.$disconnect()
    }
  })()
}
