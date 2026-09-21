import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

// Maximum allowed image size: 5 MB
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// POST /api/user/profile/image
// Accepts either a multipart/form-data upload (field name "file") OR a JSON body
// with a base64 data URI in the "image" field. Saves the file to
// /public/uploads/profiles/{userId}-{timestamp}.{ext} and stores the URL in
// User.profileImage. Returns the new profileImage URL.
export async function POST(request: NextRequest) {
  try {
    // BACK-3: Require authentication. Previously this route trusted the
    // `userId` field sent by the client (formData / JSON body), which meant
    // any unauthenticated request could overwrite ANY user's profile photo.
    // Now the userId always comes from the session — the client-supplied
    // userId is ignored.
    const session = await getSession(request)
    if (!session) {
      return error('Não autenticado', 401)
    }

    const contentType = request.headers.get('content-type') || ''

    let buffer: Buffer | null = null
    let mime = ''
    const userId = session.userId

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      // userId comes from the session (set above), NOT from the client.
      const file = formData.get('file')
      if (!file || !(file instanceof File)) {
        return error('Arquivo de imagem não encontrado (campo "file")', 400)
      }
      mime = file.type || ''
      if (!ALLOWED_MIME.includes(mime)) {
        return error(
          `Tipo de arquivo não suportado: ${mime}. Use JPEG, PNG, WebP ou GIF.`,
          400
        )
      }
      if (file.size > MAX_SIZE_BYTES) {
        return error(
          `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)} MB). Máximo: 5 MB.`,
          400
        )
      }
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      // userId comes from the session (set above), NOT from the client.
      const dataUri = String(body.image || body.dataUri || '')
      if (!dataUri) {
        return error('Imagem base64 não fornecida (campo "image")', 400)
      }
      // Parse data URI: data:image/png;base64,XXXX
      const match = dataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
      if (!match) {
        return error('Formato de data URI inválido. Use: data:image/...;base64,...', 400)
      }
      mime = match[1]
      if (!ALLOWED_MIME.includes(mime)) {
        return error(`Tipo de imagem não suportado: ${mime}`, 400)
      }
      const base64 = match[2]
      buffer = Buffer.from(base64, 'base64')
      if (buffer.length > MAX_SIZE_BYTES) {
        return error(
          `Imagem muito grande (${(buffer.length / 1024 / 1024).toFixed(2)} MB). Máximo: 5 MB.`,
          400
        )
      }
    } else {
      return error(
        'Content-Type deve ser multipart/form-data ou application/json',
        400
      )
    }

    if (!userId) {
      return error('userId é obrigatório', 400)
    }
    if (!buffer) {
      return error('Falha ao ler o conteúdo da imagem', 400)
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profileImage: true },
    })
    if (!user) {
      return error('Usuário não encontrado', 404)
    }

    // Map MIME to extension
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const ext = extMap[mime] || 'png'

    // Save the file to /public/uploads/profiles/{userId}-{timestamp}.{ext}
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    const filename = `${userId}-${Date.now()}.${ext}`
    const filePath = path.join(uploadsDir, filename)
    fs.writeFileSync(filePath, buffer)

    // Build the public URL (with cache-buster query string)
    const imageUrl = `/uploads/profiles/${filename}?t=${Date.now()}`

    // Optionally remove the previous image file (best-effort cleanup)
    if (user.profileImage && user.profileImage.startsWith('/uploads/profiles/')) {
      try {
        const oldFilename = user.profileImage.split('?')[0].split('/').pop()
        if (oldFilename) {
          const oldPath = path.join(uploadsDir, oldFilename)
          if (fs.existsSync(oldPath) && oldPath !== filePath) {
            fs.unlinkSync(oldPath)
          }
        }
      } catch {
        // ignore cleanup errors
      }
    }

    // Update the user's profileImage in DB
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { profileImage: imageUrl },
      select: { id: true, profileImage: true },
    })

    return success({
      profileImage: updated.profileImage,
      message: 'Foto de perfil atualizada com sucesso',
    })
  } catch (err) {
    console.error('Profile image upload error:', err)
    return error('Erro ao fazer upload da foto de perfil', 500)
  }
}
