'use client'

// ============================================================================
// LojistaProductForm
// ----------------------------------------------------------------------------
// Full product creation/editing form for the Lojista portal.
//
// Covers everything the lojista needs to publish a product on the NewMobility
// marketplace:
//   • Basic info (name, description, price, originalPrice, category, stock,
//     cashbackPercent, isFeatured)
//   • Photo upload zone — drag & drop OR file picker, up to 15 photos, with
//     preview thumbnails and individual remove buttons. Also accepts adding
//     photos by URL (paste a CDN URL).
//   • Specifications section — fixed fields (Marca, Modelo, Peso, Dimensões,
//     Garantia, Condição) PLUS dynamic key-value pairs for any extra tech
//     attribute the lojista wants to publish.
//
// Photos are stored as a JSON array of URLs in `MarketplaceProduct.images`.
// File uploads are converted to base64 data URLs client-side via FileReader so
// the form works without a dedicated upload endpoint. Pasted CDN URLs are
// stored as-is. Specs are stored as a JSON object in
// `MarketplaceProduct.specifications`.
//
// Submits to POST /api/marketplace/products (create) or
// PUT /api/marketplace/products/{id} (edit).
// ============================================================================

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import {
  UploadCloud,
  X,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  Plus,
  Star,
  Link as LinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch } from '@/lib/api'

// --- Types ------------------------------------------------------------------

export interface LojistaProduct {
  id?: string
  name: string
  description?: string | null
  price: number
  originalPrice?: number | null
  category: string
  imageUrl?: string | null
  images?: string | null
  specifications?: string | null
  stock: number
  cashbackPercent: number
  isFeatured: boolean
  isActive: boolean
  sellerName?: string | null
}

interface LojistaProductFormProps {
  userId: string
  product?: LojistaProduct | null
  onSaved?: (product: LojistaProduct) => void
  onCancel?: () => void
}

// --- Constants --------------------------------------------------------------

const MAX_PHOTOS = 15
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024 // 4MB per file (data-URL bloats ~33%)

const CATEGORY_OPTIONS = [
  { value: 'acessorios-veiculares', label: 'Acessórios Veiculares' },
  { value: 'eletronicos-auto', label: 'Eletrônicos Auto' },
  { value: 'servicos-automotivos', label: 'Serviços Automotivos' },
  { value: 'estetica-veicular', label: 'Estética Veicular' },
  { value: 'electronics', label: 'Eletrônicos' },
  { value: 'fashion', label: 'Moda' },
  { value: 'home', label: 'Casa' },
  { value: 'health', label: 'Saúde' },
  { value: 'beauty', label: 'Beleza' },
  { value: 'food', label: 'Alimentos' },
  { value: 'services', label: 'Serviços' },
  { value: 'mobility', label: 'Mobilidade' },
  { value: 'digital', label: 'Digital' },
]

const CONDICAO_OPTIONS = [
  { value: 'Novo', label: 'Novo' },
  { value: 'Seminovo', label: 'Seminovo' },
  { value: 'Usado', label: 'Usado' },
  { value: 'Recondicionado', label: 'Recondicionado' },
]

// Fixed specification field keys. The lojista can also add custom K-V pairs
// below these.
const FIXED_SPEC_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'marca', label: 'Marca', placeholder: 'Ex.: Bosch' },
  { key: 'modelo', label: 'Modelo', placeholder: 'Ex.: XYZ-2024' },
  { key: 'peso', label: 'Peso', placeholder: 'Ex.: 1.2 kg' },
  { key: 'dimensoes', label: 'Dimensões', placeholder: 'Ex.: 30x20x10 cm' },
  { key: 'garantia', label: 'Garantia', placeholder: 'Ex.: 12 meses' },
]

// --- Helpers ----------------------------------------------------------------

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((u) => typeof u === 'string' && u.length > 0)
    }
  } catch {
    // ignore malformed JSON
  }
  return []
}

function parseSpecs(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') out[k] = v
        else if (typeof v === 'number') out[k] = String(v)
      }
      return out
    }
  } catch {
    // ignore
  }
  return {}
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// --- Component --------------------------------------------------------------

export function LojistaProductForm({
  userId,
  product,
  onSaved,
  onCancel,
}: LojistaProductFormProps) {
  const isEdit = !!product?.id

  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState<string>(product?.price ? String(product.price) : '')
  const [originalPrice, setOriginalPrice] = useState<string>(
    product?.originalPrice ? String(product.originalPrice) : ''
  )
  const [category, setCategory] = useState(product?.category ?? '')
  const [stock, setStock] = useState<string>(product?.stock ? String(product.stock) : '0')
  const [cashbackPercent, setCashbackPercent] = useState<string>(
    product?.cashbackPercent ? String(product.cashbackPercent) : '0'
  )
  const [isFeatured, setIsFeatured] = useState<boolean>(product?.isFeatured ?? false)

  const [images, setImages] = useState<string[]>(() => {
    const fromImages = parseImages(product?.images)
    if (fromImages.length > 0) return fromImages
    // Fall back to single imageUrl for legacy products
    if (product?.imageUrl) return [product.imageUrl]
    return []
  })

  const [specs, setSpecs] = useState<Record<string, string>>(() =>
    parseSpecs(product?.specifications)
  )
  // Custom (dynamic) K-V pairs — array of { key, value } for free-form specs
  const [customSpecs, setCustomSpecs] = useState<{ key: string; value: string }[]>(() => {
    const parsed = parseSpecs(product?.specifications)
    const fixedKeys = new Set([...FIXED_SPEC_FIELDS.map((f) => f.key), 'condicao'])
    return Object.entries(parsed)
      .filter(([k]) => !fixedKeys.has(k))
      .map(([key, value]) => ({ key, value }))
  })

  const [urlInput, setUrlInput] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Photo handling -------------------------------------------------------

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) {
        toast.error('Selecione apenas arquivos de imagem.')
        return
      }
      const remaining = MAX_PHOTOS - images.length
      if (remaining <= 0) {
        toast.error(`Máximo de ${MAX_PHOTOS} fotos atingido.`)
        return
      }
      const toProcess = files.slice(0, remaining)
      if (files.length > remaining) {
        toast.warning(`Apenas ${remaining} foto(s) foram adicionadas (limite ${MAX_PHOTOS}).`)
      }
      // Size check
      const tooBig = toProcess.filter((f) => f.size > MAX_FILE_SIZE_BYTES)
      if (tooBig.length > 0) {
        toast.error(
          `Arquivo(s) maior(es) que 4MB: ${tooBig.map((f) => f.name).join(', ')}`
        )
      }
      const valid = toProcess.filter((f) => f.size <= MAX_FILE_SIZE_BYTES)
      if (valid.length === 0) return

      setUploading(true)
      try {
        const dataUrls = await Promise.all(valid.map(readFileAsDataUrl))
        setImages((prev) => [...prev, ...dataUrls].slice(0, MAX_PHOTOS))
      } catch {
        toast.error('Falha ao ler um dos arquivos. Tente novamente.')
      } finally {
        setUploading(false)
      }
    },
    [images.length]
  )

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void addFiles(e.target.files)
    }
    // Reset so picking the same file twice still fires onChange
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void addFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const addUrlImage = () => {
    const url = urlInput.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
      toast.error('URL inválida. Deve começar com http://, https:// ou data:')
      return
    }
    if (images.length >= MAX_PHOTOS) {
      toast.error(`Máximo de ${MAX_PHOTOS} fotos atingido.`)
      return
    }
    setImages((prev) => [...prev, url])
    setUrlInput('')
  }

  // --- Spec handling --------------------------------------------------------

  const setFixedSpec = (key: string, value: string) => {
    setSpecs((prev) => ({ ...prev, [key]: value }))
  }

  const addCustomSpec = () => {
    setCustomSpecs((prev) => [...prev, { key: '', value: '' }])
  }

  const updateCustomSpec = (idx: number, field: 'key' | 'value', value: string) => {
    setCustomSpecs((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    )
  }

  const removeCustomSpec = (idx: number) => {
    setCustomSpecs((prev) => prev.filter((_, i) => i !== idx))
  }

  // --- Submit ---------------------------------------------------------------

  const buildSpecsObject = (): Record<string, string> => {
    const merged: Record<string, string> = {}
    // Fixed fields (only non-empty)
    for (const f of FIXED_SPEC_FIELDS) {
      const v = (specs[f.key] ?? '').trim()
      if (v) merged[f.key] = v
    }
    // Condição (Select)
    const cond = (specs['condicao'] ?? '').trim()
    if (cond) merged['condicao'] = cond
    // Custom K-V pairs
    for (const cs of customSpecs) {
      const k = cs.key.trim()
      const v = cs.value.trim()
      if (k && v) merged[k] = v
    }
    return merged
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Nome do produto é obrigatório.'
    if (!category) return 'Categoria é obrigatória.'
    const priceNum = Number(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      return 'Preço deve ser um valor válido maior que zero.'
    }
    if (originalPrice) {
      const op = Number(originalPrice)
      if (isNaN(op) || op < 0) return 'Preço original inválido.'
      if (op <= priceNum) return 'Preço original deve ser maior que o preço atual.'
    }
    const stockNum = Number(stock)
    if (isNaN(stockNum) || stockNum < 0) return 'Estoque inválido.'
    const cb = Number(cashbackPercent)
    if (isNaN(cb) || cb < 0 || cb > 100) return 'Cashback deve ser entre 0% e 100%.'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }

    const payload = {
      userId,
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      category,
      imageUrl: images[0] ?? null, // keep single imageUrl in sync with first photo
      images, // array of up to 15 URLs
      specifications: buildSpecsObject(),
      stock: Number(stock),
      cashbackPercent: Number(cashbackPercent),
      isFeatured,
      sellerName: product?.sellerName ?? undefined,
    }

    setSaving(true)
    try {
      if (isEdit && product?.id) {
        const data = await apiFetch<{ product: LojistaProduct }>(
          `/marketplace/products/${product.id}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        )
        toast.success('Produto atualizado com sucesso!')
        onSaved?.(data.product)
      } else {
        const data = await apiFetch<{ product: LojistaProduct }>(
          `/marketplace/products`,
          { method: 'POST', body: JSON.stringify(payload) }
        )
        toast.success('Produto criado com sucesso!')
        onSaved?.(data.product)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar produto.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // --- Render ---------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="px-4 sm:px-6 py-5 space-y-6">
          {/* ── Basic info ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                1
              </span>
              Informações básicas
            </h3>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="lpf-name">
                  Nome do produto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lpf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Pneu Aro 15 Firestone 195/65"
                  maxLength={140}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lpf-desc">Descrição detalhada</Label>
                <Textarea
                  id="lpf-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o produto, características, condições de uso, etc."
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-[11px] text-muted-foreground">
                  {description.length}/2000 caracteres
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="lpf-price">
                    Preço (R$) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lpf-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lpf-oldprice">Preço original (R$)</Label>
                  <Input
                    id="lpf-oldprice"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="Opcional — para mostrar desconto"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="lpf-cat">
                    Categoria <span className="text-red-500">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="lpf-cat" className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lpf-stock">Estoque</Label>
                  <Input
                    id="lpf-stock"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="lpf-cb">Cashback (%)</Label>
                  <Input
                    id="lpf-cb"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.1"
                    value={cashbackPercent}
                    onChange={(e) => setCashbackPercent(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    id="lpf-feat"
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                  <Label htmlFor="lpf-feat" className="cursor-pointer text-sm">
                    Destacar produto
                    <span className="block text-[11px] text-muted-foreground">
                      Aparece em primeiro na vitrine
                    </span>
                  </Label>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Photo upload ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                  2
                </span>
                Fotos do produto
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {images.length}/{MAX_PHOTOS}
              </Badge>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              className={`
                relative cursor-pointer rounded-xl border-2 border-dashed
                p-6 text-center transition-colors
                ${
                  dragging
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50'
                }
              `}
              aria-label="Área de upload de fotos"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                ) : (
                  <UploadCloud className="h-8 w-8 text-gray-400" />
                )}
                <p className="text-sm font-medium text-foreground">
                  {uploading
                    ? 'Processando fotos...'
                    : 'Arraste fotos aqui ou clique para selecionar'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG ou WebP · até 4MB cada · máx. {MAX_PHOTOS} fotos
                </p>
              </div>
            </div>

            {/* URL input — alternative to file upload */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Ou cole uma URL de imagem (https://...)"
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addUrlImage()
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addUrlImage}
                disabled={!urlInput.trim() || images.length >= MAX_PHOTOS}
              >
                <ImagePlus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Thumbnails */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {images.map((url, idx) => (
                  <div
                    key={`${idx}-${url.slice(0, 32)}`}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={url}
                      alt={`Foto ${idx + 1} do produto`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // If the URL fails to load, show a placeholder
                        const t = e.currentTarget
                        t.style.display = 'none'
                        const parent = t.parentElement
                        if (parent && !parent.querySelector('.img-fallback')) {
                          const div = document.createElement('div')
                          div.className =
                            'img-fallback absolute inset-0 flex items-center justify-center text-gray-400 text-[10px] text-center px-1'
                          div.textContent = 'Falha ao carregar'
                          parent.appendChild(div)
                        }
                      }}
                    />
                    {idx === 0 && (
                      <Badge className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] border-0 px-1 py-0">
                        Capa
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(idx)
                      }}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      aria-label={`Remover foto ${idx + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* ── Specifications ────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                3
              </span>
              Especificações técnicas
            </h3>

            {/* Fixed fields */}
            <div className="grid grid-cols-2 gap-3">
              {FIXED_SPEC_FIELDS.map((f) => (
                <div key={f.key} className="grid gap-1.5">
                  <Label htmlFor={`lpf-spec-${f.key}`} className="text-xs">
                    {f.label}
                  </Label>
                  <Input
                    id={`lpf-spec-${f.key}`}
                    value={specs[f.key] ?? ''}
                    onChange={(e) => setFixedSpec(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              {/* Condição (Select) */}
              <div className="grid gap-1.5">
                <Label htmlFor="lpf-spec-condicao" className="text-xs">
                  Condição
                </Label>
                <Select
                  value={specs['condicao'] ?? ''}
                  onValueChange={(v) => setFixedSpec('condicao', v)}
                >
                  <SelectTrigger id="lpf-spec-condicao" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDICAO_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom K-V pairs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Especificações adicionais
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addCustomSpec}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              {customSpecs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic px-1">
                  Nenhuma especificação adicional. Clique em &ldquo;Adicionar&rdquo; para incluir
                  atributos como Voltagem, Cor, Material, etc.
                </p>
              ) : (
                customSpecs.map((cs, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="grid gap-1.5 flex-1">
                      <Label className="text-[10px] text-muted-foreground">Atributo</Label>
                      <Input
                        value={cs.key}
                        onChange={(e) => updateCustomSpec(idx, 'key', e.target.value)}
                        placeholder="Ex.: Voltagem"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5 flex-1">
                      <Label className="text-[10px] text-muted-foreground">Valor</Label>
                      <Input
                        value={cs.value}
                        onChange={(e) => updateCustomSpec(idx, 'value', e.target.value)}
                        placeholder="Ex.: 12V"
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomSpec(idx)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      aria-label="Remover especificação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Featured hint */}
          {isFeatured && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              Este produto será destacado na vitrine do marketplace.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer actions — sticky at bottom of dialog */}
      <div className="border-t border-gray-100 bg-white px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saving || uploading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isEdit ? 'Salvar alterações' : 'Publicar produto'}
        </Button>
      </div>
    </div>
  )
}

export default LojistaProductForm
