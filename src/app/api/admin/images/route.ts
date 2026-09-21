import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    const imageConfigs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'image_' } }
    })

    const defaults: Record<string, string> = {
      image_logo: '/placeholder-logo.png',
      image_banner: '/placeholder-banner.png',
      image_plan_free: '/placeholder-plan-free.png',
      image_plan_blue3: '/placeholder-plan-blue3.png',
      image_plan_blue5: '/placeholder-plan-blue5.png',
      image_promo_1: '/placeholder-promo.png',
      image_promo_2: '/placeholder-promo.png',
      image_icon_favicon: '/placeholder-favicon.ico',
      image_icon_apple_touch: '/placeholder-apple-touch.png',
      image_login_bg: '/placeholder-login-bg.png',
    }

    for (const [key, value] of Object.entries(defaults)) {
      if (!imageConfigs.find(c => c.key === key)) {
        await prisma.systemConfig.upsert({
          where: { key },
          update: {},
          create: { key, value, description: `System image: ${key.replace('image_', '')}` }
        })
        imageConfigs.push({ key, value, description: `System image: ${key.replace('image_', '')}`, id: '', updatedAt: new Date() })
      }
    }

    const imageMap: Record<string, { value: string; description: string | null; category: string }> = {}
    for (const c of imageConfigs) {
      const cat = c.key.replace('image_', '').split('_')[0]
      imageMap[c.key] = { value: c.value, description: c.description, category: cat }
    }

    return success(imageMap)
  } catch (err) {
    return error('Failed to fetch images', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, images } = body
    if (!userId) return error('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'admin') return error('Unauthorized', 403)

    if (!images || typeof images !== 'object') return error('images object is required', 400)

    const updates = Object.entries(images).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), description: `System image: ${key.replace('image_', '')}` },
      })
    )

    await Promise.all(updates)
    return success({ message: 'Images updated successfully' })
  } catch (err) {
    return error('Failed to update images', 500)
  }
}
