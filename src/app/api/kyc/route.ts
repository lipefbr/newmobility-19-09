import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'
import { getSession } from '@/lib/auth'
import { KYC_DOC_TYPES, type KycDocType, invalidateKycCache } from '@/lib/kyc'

/**
 * GET /api/kyc
 * Returns the current user's KYC status + their uploaded KycDocuments.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return error('Não autenticado', 401)

    const [user, documents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          kycStatus: true,
          kycVerifiedAt: true,
          kycRejectedReason: true,
          kycVerifiedById: true,
          name: true,
          email: true,
          cpf: true,
        },
      }),
      prisma.kycDocument.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!user) return error('Usuário não encontrado', 404)

    // Count how many of the 5 required docTypes are uploaded
    const uploadedTypes = new Set(documents.map((d) => d.docType))
    const uploadedCount = KYC_DOC_TYPES.filter((t) => uploadedTypes.has(t)).length

    return success({
      status: user.kycStatus,
      kycVerifiedAt: user.kycVerifiedAt,
      kycRejectedReason: user.kycRejectedReason,
      kycVerifiedById: user.kycVerifiedById,
      user: {
        name: user.name,
        email: user.email,
        cpf: user.cpf,
      },
      documents: documents.map((d) => ({
        id: d.id,
        docType: d.docType,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        status: d.status,
        rejectReason: d.rejectReason,
        reviewedAt: d.reviewedAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      uploadedCount,
      totalRequired: KYC_DOC_TYPES.length,
      requiredDocTypes: KYC_DOC_TYPES,
    })
  } catch (err) {
    console.error('GET /api/kyc error:', err)
    return error('Erro ao buscar documentos KYC', 500)
  }
}

interface UploadBody {
  docType: string
  fileUrl: string
  fileName?: string
  fileSize?: number
  mimeType?: string
}

const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

/**
 * POST /api/kyc
 * Upload (or replace) a document. Body:
 *   { docType, fileUrl (base64 data URL), fileName?, fileSize?, mimeType? }
 * Sets user.kycStatus='pending' if currently 'none'.
 * Returns the created/updated KycDocument.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return error('Não autenticado', 401)

    let body: UploadBody
    try {
      body = (await req.json()) as UploadBody
    } catch {
      return error('JSON inválido', 400)
    }

    const { docType, fileUrl, fileName, fileSize, mimeType } = body

    // Validate docType
    if (!docType || !KYC_DOC_TYPES.includes(docType as KycDocType)) {
      return error(
        `Tipo de documento inválido. Permitidos: ${KYC_DOC_TYPES.join(', ')}`,
        400
      )
    }

    // Validate fileUrl (must be a base64 data URL)
    if (!fileUrl || typeof fileUrl !== 'string') {
      return error('fileUrl é obrigatório', 400)
    }
    if (!fileUrl.startsWith('data:')) {
      return error(
        'fileUrl deve ser uma data URL base64 (data:image/... ou data:application/pdf)',
        400
      )
    }

    // Size sanity check (3 MB). data URL is ~33% larger than the raw bytes;
    // we accept up to ~4 MB data URL which corresponds to ~3 MB raw.
    if (fileUrl.length > 4 * 1024 * 1024) {
      return error('Arquivo muito grande. Máximo 3 MB.', 400)
    }
    if (typeof fileSize === 'number' && fileSize > MAX_FILE_SIZE) {
      return error('Arquivo muito grande. Máximo 3 MB.', 400)
    }

    // Validate mimeType if provided
    if (mimeType && !ALLOWED_MIME.has(mimeType)) {
      return error(
        'Tipo de arquivo não suportado. Use imagem (JPG/PNG/WebP/GIF) ou PDF.',
        400
      )
    }

    // If user is already approved, re-uploading one document should push them
    // back into 'pending' so admin can re-review (the new doc may invalidate
    // the prior approval). Same for 'rejected': a new upload re-enters analysis.
    // We use upsert because KycDocument has @@unique([userId, docType]).
    const now = new Date()
    const doc = await prisma.kycDocument.upsert({
      where: {
        userId_docType: {
          userId: session.userId,
          docType: docType as string,
        },
      },
      create: {
        userId: session.userId,
        docType: docType as string,
        fileUrl,
        fileName: fileName ?? null,
        fileSize: fileSize ?? null,
        mimeType: mimeType ?? null,
        status: 'pending',
      },
      update: {
        fileUrl,
        fileName: fileName ?? null,
        fileSize: fileSize ?? null,
        mimeType: mimeType ?? null,
        status: 'pending',
        rejectReason: null,
        reviewedById: null,
        reviewedAt: null,
        updatedAt: now,
      },
    })

    // Flip the user's kycStatus: none → pending, rejected → pending, approved
    // → pending (new doc invalidates prior approval). 'pending' stays pending.
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { kycStatus: true },
    })
    if (user && user.kycStatus !== 'pending') {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          kycStatus: 'pending',
          kycRejectedReason: null,
        },
      })
      // Invalidate the KYC approval cache so the new 'pending' status
      // is reflected immediately on the next gated API call (a previously
      // 'approved' user must be re-blocked until admin re-approves).
      invalidateKycCache(session.userId)
    }

    return success({
      document: {
        id: doc.id,
        docType: doc.docType,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      message: 'Documento enviado. Aguarde a análise da equipe.',
    })
  } catch (err) {
    console.error('POST /api/kyc error:', err)
    return error('Erro ao enviar documento KYC', 500)
  }
}
