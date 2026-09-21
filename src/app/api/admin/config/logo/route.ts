import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { logAudit } from '@/lib/audit'

/**
 * POST /api/admin/config/logo
 *
 * Saves a logo (base64 data URL) into SystemConfig under `app_logo_url`.
 * The admin "Configurações" panel uses this to let the platform owner
 * replace the NewMobility logo without redeploying.
 *
 * Body: { userId, logoUrl }
 *   logoUrl — must start with `data:image/` (base64 data URL) and be under 1 MB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, logoUrl } = body as { userId?: string; logoUrl?: string }
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    if (!logoUrl || typeof logoUrl !== 'string') {
      return error('logoUrl is required', 400)
    }
    if (!logoUrl.startsWith('data:image/')) {
      return error('logoUrl must be a base64 data URL starting with "data:image/"', 400)
    }
    // 1 MB cap — protects the DB column from accidental huge uploads.
    if (logoUrl.length > 1_400_000) {
      return error('Logo muito grande. Reduza para menos de 1 MB.', 413)
    }

    await prisma.systemConfig.upsert({
      where: { key: 'app_logo_url' },
      update: { value: logoUrl },
      create: { key: 'app_logo_url', value: logoUrl, description: 'Platform logo (base64 data URL)' },
    })

    await logAudit({
      adminId: admin.id,
      adminName: admin.name || admin.email,
      action: 'config_change',
      details: 'Logo da plataforma atualizada (app_logo_url)',
      ipAddress: req.headers.get('x-forwarded-for') || null,
    })

    return success({ message: 'Logo salva com sucesso', logoUrl })
  } catch (err) {
    console.error('Admin config logo POST error:', err)
    return error('Failed to save logo', 500)
  }
}

/**
 * GET /api/admin/config/logo
 *
 * Returns the current logo data URL (or null if not set) so the admin panel
 * can render a preview before saving.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const admin = await prisma.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== 'admin') return error('Unauthorized', 403)

    const row = await prisma.systemConfig.findUnique({ where: { key: 'app_logo_url' } })
    return success({ logoUrl: row?.value || null })
  } catch (err) {
    console.error('Admin config logo GET error:', err)
    return error('Failed to fetch logo', 500)
  }
}
