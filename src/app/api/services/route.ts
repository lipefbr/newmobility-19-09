import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

// ============================================================================
// /api/services
// ----------------------------------------------------------------------------
// Public + authenticated endpoints for the Services module (Item 8).
//
// GET  ?providerId=&category=&limit=   → list services (optionally filtered)
// POST multipart/form-data OR json     → create a new service with photos.
//
// Photos: up to 5 image files accepted. Sent either as multiple "photos" file
// fields in multipart/form-data, OR as a JSON array of base64 data URIs under
// the "photos" key. Each image is saved to /public/uploads/services/{id}.ext
// and the resulting URLs are stored as a JSON array in Service.photos.
//
// Authentication: POST requires a valid session (provider must be logged in).
// GET is public so visitors can browse the catalogue.
// ============================================================================

const MAX_PHOTOS = 5
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB each
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function ensureUploadsDir() {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'services')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

async function savePhotoBuffer(buffer: Buffer, mime: string, prefix: string): Promise<string> {
  const ext = EXT_MAP[mime] || 'png'
  const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`
  const dir = ensureUploadsDir()
  fs.writeFileSync(path.join(dir, filename), buffer)
  return `/uploads/services/${filename}`
}

// GET — public list
export async function GET(req: NextRequest) {
  try {
    const providerId = req.nextUrl.searchParams.get('providerId')
    const category = req.nextUrl.searchParams.get('category')
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 100, 200)

    const where: { providerId?: string; category?: string; isAvailable?: boolean } = {}
    if (providerId) where.providerId = providerId
    if (category && category !== 'all') where.category = category

    const services = await prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Decode the JSON photos array for each service so the client gets a
    // ready-to-use string[] instead of a raw JSON string.
    const decoded = services.map((s) => {
      let photos: string[] = []
      try {
        const parsed = JSON.parse(s.photos || '[]')
        if (Array.isArray(parsed)) photos = parsed.filter((p) => typeof p === 'string')
      } catch {
        photos = []
      }
      return { ...s, photos }
    })

    return success({ services: decoded })
  } catch (err) {
    console.error('Services GET error:', err)
    return success({ services: [] })
  }
}

// POST — create a new service (authenticated)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return error('Não autenticado', 401)
    }
    const userId = session.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true },
    })
    if (!user) return error('Usuário não encontrado', 404)

    const contentType = request.headers.get('content-type') || ''

    // Extract fields + photos depending on the content type.
    let name = ''
    let description: string | null = null
    let category = ''
    let priceCents = 0
    let location: string | null = null
    let phone: string | null = null
    const photoBuffers: { buffer: Buffer; mime: string }[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      name = String(formData.get('name') || '').trim()
      description = (formData.get('description') as string | null)?.trim() || null
      category = String(formData.get('category') || '').trim()
      const priceStr = String(formData.get('price') || '').trim()
      // Accept either cents ("priceCents") or reais ("price").
      const priceCentsStr = String(formData.get('priceCents') || '').trim()
      if (priceCentsStr) {
        priceCents = Math.round(Number(priceCentsStr))
      } else if (priceStr) {
        priceCents = Math.round(Number(priceStr.replace(',', '.')) * 100)
      }
      location = (formData.get('location') as string | null)?.trim() || null
      phone = (formData.get('phone') as string | null)?.trim() || user.phone || null

      const files = formData.getAll('photos')
      for (const f of files) {
        if (photoBuffers.length >= MAX_PHOTOS) break
        if (!(f instanceof File)) continue
        if (!ALLOWED_MIME.includes(f.type)) {
          return error(`Tipo de foto não suportado: ${f.type}. Use JPEG, PNG, WebP ou GIF.`, 400)
        }
        if (f.size > MAX_PHOTO_SIZE_BYTES) {
          return error(
            `Foto muito grande (${(f.size / 1024 / 1024).toFixed(2)} MB). Máximo: 5 MB por foto.`,
            400,
          )
        }
        const buf = Buffer.from(await f.arrayBuffer())
        photoBuffers.push({ buffer: buf, mime: f.type })
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      name = String(body.name || '').trim()
      description = body.description ? String(body.description).trim() : null
      category = String(body.category || '').trim()
      const priceStr = body.price !== undefined ? String(body.price) : ''
      const priceCentsStr = body.priceCents !== undefined ? String(body.priceCents) : ''
      if (priceCentsStr) {
        priceCents = Math.round(Number(priceCentsStr))
      } else if (priceStr) {
        priceCents = Math.round(Number(priceStr.replace(',', '.')) * 100)
      }
      location = body.location ? String(body.location).trim() : null
      phone = body.phone ? String(body.phone).trim() : user.phone || null

      // Photos: JSON array of base64 data URIs.
      if (Array.isArray(body.photos)) {
        for (const dataUri of body.photos) {
          if (photoBuffers.length >= MAX_PHOTOS) break
          if (typeof dataUri !== 'string') continue
          const match = dataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
          if (!match) {
            return error('Uma das fotos tem formato de data URI inválido.', 400)
          }
          const mime = match[1]
          if (!ALLOWED_MIME.includes(mime)) {
            return error(`Tipo de foto não suportado: ${mime}`, 400)
          }
          const buf = Buffer.from(match[2], 'base64')
          if (buf.length > MAX_PHOTO_SIZE_BYTES) {
            return error(
              `Foto muito grande (${(buf.length / 1024 / 1024).toFixed(2)} MB). Máximo: 5 MB por foto.`,
              400,
            )
          }
          photoBuffers.push({ buffer: buf, mime })
        }
      }
    } else {
      return error('Content-Type deve ser multipart/form-data ou application/json', 400)
    }

    if (!name) return error('name é obrigatório', 400)
    if (!category) return error('category é obrigatório', 400)
    if (isNaN(priceCents) || priceCents < 0) {
      return error('preço inválido', 400)
    }

    // Persist the photos to /public/uploads/services/.
    const photoUrls: string[] = []
    for (const { buffer, mime } of photoBuffers) {
      const url = await savePhotoBuffer(buffer, mime, userId)
      photoUrls.push(url)
    }

    const created = await prisma.service.create({
      data: {
        providerId: user.id,
        providerName: user.name,
        name,
        description,
        category,
        price: priceCents,
        location,
        phone,
        photos: JSON.stringify(photoUrls),
        isAvailable: true,
      },
    })

    return success({ ...created, photos: photoUrls }, 201)
  } catch (err) {
    console.error('Services POST error:', err)
    return error('Erro ao criar serviço', 500)
  }
}
