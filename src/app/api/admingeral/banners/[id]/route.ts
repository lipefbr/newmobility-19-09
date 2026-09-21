import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { requireAppAdmin } from '@/lib/admingeral-guard'

// /api/admingeral/banners/[id] — update/delete a banner.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const { id } = await params
    const body = await req.json()
    const allowed: Record<string, unknown> = {}
    for (const k of ['title','subtitle','ctaLabel','ctaHref','imageUrl','accentColor','sortOrder','isActive','surface','startsAt','endsAt']) {
      if (k in body) allowed[k] = body[k]
    }
    const updated = await prisma.mobileBanner.update({ where: { id }, data: allowed })
    return success(updated)
  } catch (err) {
    console.error('[/api/admingeral/banners/[id] PATCH] error:', err)
    return error('Internal server error', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAppAdmin(req.nextUrl.searchParams.get('userId'))
    if (!admin) return error('Unauthorized', 403)
    const { id } = await params
    await prisma.mobileBanner.delete({ where: { id } })
    return success({ deleted: true })
  } catch (err) {
    console.error('[/api/admingeral/banners/[id] DELETE] error:', err)
    return error('Internal server error', 500)
  }
}
