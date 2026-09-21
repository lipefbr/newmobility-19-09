'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  IdCard,
  FileText,
  MapPin,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  AlertCircle,
  ShieldCheck,
  Eye,
  RefreshCw,
  Camera,
} from 'lucide-react'

// ---------- Types ----------

type KycStatus = 'none' | 'pending' | 'approved' | 'rejected'
type DocStatus = 'pending' | 'approved' | 'rejected'

interface KycDocument {
  id: string
  docType: string
  fileUrl: string
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  status: DocStatus
  rejectReason: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

interface KycResponse {
  status: KycStatus
  kycVerifiedAt: string | null
  kycRejectedReason: string | null
  kycVerifiedById: string | null
  user: { name: string; email: string; cpf: string | null }
  documents: KycDocument[]
  uploadedCount: number
  totalRequired: number
  requiredDocTypes: string[]
}

// ---------- Doc type metadata ----------

interface DocMeta {
  type: string
  title: string
  description: string
  Icon: typeof IdCard
}

const DOC_METAS: DocMeta[] = [
  {
    type: 'cnh_front',
    title: 'CNH Frente',
    description: 'Foto nítida da frente da CNH',
    Icon: IdCard,
  },
  {
    type: 'cnh_back',
    title: 'CNH Verso',
    description: 'Foto nítida do verso da CNH',
    Icon: IdCard,
  },
  {
    type: 'rg_front',
    title: 'RG Frente',
    description: 'Foto da frente do RG (caso não tenha CNH)',
    Icon: FileText,
  },
  {
    type: 'rg_back',
    title: 'RG Verso',
    description: 'Foto do verso do RG',
    Icon: FileText,
  },
  {
    type: 'proof_address',
    title: 'Comprovante de Endereço',
    description: 'Conta de água/luz/telefone com CEP (últimos 90 dias)',
    Icon: MapPin,
  },
  {
    type: 'selfie_document',
    title: 'Selfie com Documento',
    description: 'Foto segurando o documento de identificação ao lado do rosto',
    Icon: Camera,
  },
]

const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

// ---------- Helpers ----------

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ---------- Status banner ----------

function StatusBanner({ status, reason }: { status: KycStatus; reason: string | null }) {
  if (status === 'approved') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
        <div className="rounded-full bg-emerald-100 p-2">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Documentos verificados ✓</p>
          <p className="text-sm text-emerald-700">
            Sua conta está liberada para saques, cashback e evolução de plano.
          </p>
        </div>
      </div>
    )
  }
  if (status === 'pending') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
        <div className="rounded-full bg-amber-100 p-2">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Documentos em análise</p>
          <p className="text-sm text-amber-700">
            Nossa equipe está verificando seus documentos — geralmente 24h. Saques
            e cashback ficam bloqueados até a aprovação.
          </p>
        </div>
      </div>
    )
  }
  if (status === 'rejected') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm">
        <div className="rounded-full bg-red-100 p-2">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Documentos rejeitados</p>
          <p className="text-sm text-red-700">
            {reason
              ? `Motivo: ${reason}. Reenvie os documentos abaixo para nova análise.`
              : 'Reenvie os documentos abaixo para nova análise.'}
          </p>
        </div>
      </div>
    )
  }
  // none
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900 shadow-sm">
      <div className="rounded-full bg-sky-100 p-2">
        <Info className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">Envie seus documentos</p>
        <p className="text-sm text-sky-700">
          Para liberar saques, cashback e evolução de plano, envie todos os
          documentos abaixo. Leva menos de 2 minutos.
        </p>
      </div>
    </div>
  )
}

// ---------- Doc badge ----------

function DocBadge({ status }: { status: DocStatus | 'missing' }) {
  if (status === 'approved') {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Aprovado
      </Badge>
    )
  }
  if (status === 'pending') {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-800">
        <Clock className="h-3 w-3" /> Em análise
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge className="border-transparent bg-red-100 text-red-800">
        <XCircle className="h-3 w-3" /> Rejeitado
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-gray-100 text-gray-600">
      Não enviado
    </Badge>
  )
}

// ---------- Doc upload card ----------

interface DocCardProps {
  meta: DocMeta
  doc: KycDocument | undefined
  onUpload: (file: File) => Promise<void>
  onDelete: (docId: string) => Promise<void>
  uploading: boolean
}

function DocUploadCard({ meta, doc, onUpload, onDelete, uploading }: DocCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [deleting, setDeleting] = useState(false)
  const status: DocStatus | 'missing' = doc?.status ?? 'missing'
  const canDelete = doc && (doc.status === 'pending' || doc.status === 'rejected')
  const isImage = doc?.mimeType?.startsWith('image/') ?? doc?.fileUrl.startsWith('data:image/')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so picking the same file again re-fires onChange
    if (inputRef.current) inputRef.current.value = ''
    await onUpload(file)
  }

  async function handleDelete() {
    if (!doc) return
    setDeleting(true)
    try {
      await onDelete(doc.id)
    } finally {
      setDeleting(false)
    }
  }

  const Icon = meta.Icon

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-2.5">
              <Icon className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <CardTitle className="text-sm">{meta.title}</CardTitle>
              <CardDescription className="text-xs">{meta.description}</CardDescription>
            </div>
          </div>
          <DocBadge status={status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Preview / placeholder */}
        {doc ? (
          <div className="space-y-3">
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
            >
              {isImage ? (
                <img
                  src={doc.fileUrl}
                  alt={meta.title}
                  className="h-36 w-full object-cover transition group-hover:opacity-90"
                />
              ) : (
                <div className="flex h-36 w-full items-center justify-center gap-2 text-gray-600">
                  <FileText className="h-8 w-8" />
                  <span className="text-sm font-medium">PDF · tocar para abrir</span>
                </div>
              )}
            </a>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate" title={doc.fileName ?? ''}>
                {doc.fileName ?? 'arquivo'} · {formatBytes(doc.fileSize)}
              </span>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-700 hover:underline"
              >
                <Eye className="h-3 w-3" /> Ver
              </a>
            </div>
            {doc.rejectReason && (
              <p className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">
                Rejeitado: {doc.rejectReason}
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center">
            <Upload className="h-6 w-6 text-gray-400" />
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou PDF · máx 3 MB
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFile}
            className="hidden"
          />
          <Button
            type="button"
            variant={doc ? 'outline' : 'default'}
            className="flex-1 rounded-xl"
            disabled={uploading || deleting}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
              </>
            ) : doc ? (
              <>
                <RefreshCw className="h-4 w-4" /> Reenviar
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Enviar
              </>
            )}
          </Button>
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl border-gray-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={deleting || uploading}
              onClick={handleDelete}
              title="Excluir documento"
              aria-label="Excluir documento"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Main page ----------

export default function KycPage() {
  const user = useStore((s) => s.user)
  const [data, setData] = useState<KycResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingType, setUploadingType] = useState<string | null>(null)

  const loadKyc = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/kyc?userId=${encodeURIComponent(user.id)}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error((json as { error?: string })?.error || 'Falha ao carregar KYC')
      }
      setData(json as KycResponse)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar KYC'
      toast.error(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      setLoading(true)
      loadKyc()
    } else {
      setLoading(false)
    }
  }, [user?.id, loadKyc])

  const handleUpload = useCallback(
    async (docType: string, file: File) => {
      if (!user?.id) {
        toast.error('Sessão expirada. Faça login novamente.')
        return
      }
      // Validate file
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Arquivo muito grande. Máximo 3 MB.')
        return
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Tipo de arquivo inválido. Use JPG, PNG, WebP, GIF ou PDF.')
        return
      }

      setUploadingType(docType)
      try {
        const fileUrl = await readFileAsDataUrl(file)
        const res = await fetch(`/api/kyc?userId=${encodeURIComponent(user.id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docType,
            fileUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(
            (json as { error?: string })?.error || 'Falha ao enviar documento'
          )
        }
        toast.success('Documento enviado! Aguarde a análise da equipe.')
        await loadKyc()
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Falha ao enviar documento'
        toast.error(msg)
      } finally {
        setUploadingType(null)
      }
    },
    [user?.id, loadKyc]
  )

  const handleDelete = useCallback(
    async (docId: string) => {
      if (!user?.id) return
      try {
        const res = await fetch(
          `/api/kyc/${encodeURIComponent(docId)}?userId=${encodeURIComponent(user.id)}`,
          { method: 'DELETE' }
        )
        const json = await res.json()
        if (!res.ok) {
          throw new Error(
            (json as { error?: string })?.error || 'Falha ao excluir documento'
          )
        }
        toast.success('Documento excluído.')
        await loadKyc()
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Falha ao excluir documento'
        toast.error(msg)
      }
    },
    [user?.id, loadKyc]
  )

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user?.id) {
    return (
      <div className="p-4 md:p-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-gray-100 p-3">
              <Info className="h-6 w-6 text-gray-500" />
            </div>
            <p className="font-semibold text-gray-800">Faça login para ver seus documentos</p>
            <p className="text-sm text-muted-foreground">
              Você precisa estar autenticado para enviar e acompanhar seus documentos KYC.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = data?.status ?? 'none'
  const uploadedCount = data?.uploadedCount ?? 0
  const totalRequired = data?.totalRequired ?? 5
  const progressPct = Math.round((uploadedCount / totalRequired) * 100)
  const docsByType: Record<string, KycDocument> = {}
  for (const d of data?.documents ?? []) {
    // Keep the most recently updated doc per type (defensive — should be unique)
    if (!docsByType[d.docType] || new Date(d.updatedAt) > new Date(docsByType[d.docType].updatedAt)) {
      docsByType[d.docType] = d
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">Verificação de Documentos (KYC)</h1>
        <p className="text-sm text-muted-foreground">
          Envie seus documentos para liberar saques, cashback e evolução de plano.
        </p>
      </div>

      {/* Status banner */}
      <StatusBanner status={status} reason={data?.kycRejectedReason ?? null} />

      {/* Doc cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOC_METAS.map((meta) => (
          <DocUploadCard
            key={meta.type}
            meta={meta}
            doc={docsByType[meta.type]}
            onUpload={(file) => handleUpload(meta.type, file)}
            onDelete={handleDelete}
            uploading={uploadingType === meta.type}
          />
        ))}
      </div>

      {/* Progress */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Progresso de envio</CardTitle>
              <CardDescription>
                {uploadedCount} de {totalRequired} documentos enviados
              </CardDescription>
            </div>
            <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
              {progressPct}%
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPct} className="h-3 w-full" />
          <p className="mt-3 text-xs text-muted-foreground">
            {status === 'approved'
              ? 'Tudo pronto! Sua conta está verificada.'
              : status === 'pending'
                ? 'Documentos enviados. Aguarde a análise da nossa equipe (geralmente 24h).'
                : status === 'rejected'
                  ? 'Reenvie os documentos rejeitados acima para nova análise.'
                  : 'Envie todos os documentos acima para iniciar a verificação.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
