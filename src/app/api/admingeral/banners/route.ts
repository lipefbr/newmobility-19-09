import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/banners — list + create mobile banners.

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const banners = await prisma.mobileBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], take: 50 })
    return success({ banners })
  } catch (err) {
    console.error('[/api/admingeral/banners GET] error:', err)
    return error('Internal server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const body = await req.json()
    const { title, subtitle, ctaLabel, ctaHref, imageUrl, accentColor, sortOrder, isActive, surface, startsAt, endsAt } = body
    if (!title) return error('title é obrigatório', 400)
    const created = await prisma.mobileBanner.create({
      data: {
        title, subtitle: subtitle || null, ctaLabel: ctaLabel || null, ctaHref: ctaHref || null,
        imageUrl: imageUrl || null, accentColor: accentColor || '#155EEF',
        sortOrder: Number(sortOrder) || 99, isActive: isActive !== false,
        surface: surface || 'mobile', startsAt: startsAt || null, endsAt: endsAt || null,
      },
    })
    return success(created, 201)
  } catch (err) {
    console.error('[/api/admingeral/banners POST] error:', err)
    return error('Internal server error', 500)
  }
}
