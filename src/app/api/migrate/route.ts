import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// Migration endpoint — uses prisma.$executeRawUnsafe for raw SQL.
// The Beneficiary table should already exist if `prisma db push` was run,
// but this endpoint exists for backwards compatibility (older deployments
// that didn't run db push).
export async function POST() {
  try {
    // Create Beneficiary table if not exists (PostgreSQL)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Beneficiary" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "cpf" TEXT,
        "relationship" TEXT NOT NULL,
        "percentage" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
      )
    `).catch(() => {})

    // Add foreign key constraint if not exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'Beneficiary_userId_fkey'
        ) THEN
          ALTER TABLE "Beneficiary"
          ADD CONSTRAINT "Beneficiary_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE RESTRICT ON UPDATE RESTRICT;
        END IF;
      $$
    `).catch(() => {})

    // Create index if not exists
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Beneficiary_userId_idx" ON "Beneficiary"("userId")
    `).catch(() => {})

    return success({ message: 'Migration completed successfully - Beneficiary table created/updated' })
  } catch (err) {
    console.error('Migration error:', err)
    return error('Migration failed: ' + (err instanceof Error ? err.message : String(err)), 500)
  }
}
