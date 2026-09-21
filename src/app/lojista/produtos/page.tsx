'use client'

// ============================================================================
// /lojista/produtos — Painel de gestão de produtos da loja.
// ----------------------------------------------------------------------------
// Lista os produtos publicados pelo lojista logado (filtrados por sellerName).
// Permite criar um novo produto ou editar/excluir um existente.
//
// Toda a lógica de formulário (fotos + especificações) fica em
// <LojistaProductForm />, abrigada num Dialog para UX mobile-friendly.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  ImageIcon,
  Star,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useStore } from '@/lib/store'
import { LojistaAppShell } from '@/components/lojista/lojista-app-shell'
import { LojistaProductForm, type LojistaProduct } from '@/components/lojista/lojista-product-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const PRIMARY = '#155EEF'

// Mirror of MarketplaceProduct — only the fields the list needs.
interface ProductListItem {
  id: string
  name: string
  description?: string | null
  price: number
  originalPrice?: number | null
  category: string
  imageUrl?: string | null
  images?: string | null
  specifications?: string | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  cashbackPercent: number
  sellerName?: string | null
}

function parseFirstImage(raw: string | null | undefined, fallback?: string | null): string | null {
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed[0]
      }
    } catch {
      // ignore
    }
  }
  return fallback ?? null
}

function countImages(raw: string | null | undefined, fallback?: string | null): number {
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.length
    } catch {
      // ignore
    }
  }
  return fallback ? 1 : 0
}

function countSpecs(raw: string | null | undefined): number {
  if (!raw) return 0
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.keys(parsed).length
    }
  } catch {
    // ignore
  }
  return 0
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// Category labels (mirror of marketplace categories)
const CATEGORY_LABELS: Record<string, string> = {
  'acessorios-veiculares': 'Acessórios Veiculares',
  'eletronicos-auto': 'Eletrônicos Auto',
  'servicos-automotivos': 'Serviços Automotivos',
  'estetica-veicular': 'Estética Veicular',
  electronics: 'Eletrônicos',
  fashion: 'Moda',
  home: 'Casa',
  health: 'Saúde',
  beauty: 'Beleza',
  food: 'Alimentos',
  services: 'Serviços',
  mobility: 'Mobilidade',
  digital: 'Digital',
}

export default function LojistaProdutosPage() {
  const router = useRouter()
  const { user } = useStore()

  const [authChecked, setAuthChecked] = useState(false)
  const [isLojista, setIsLojista] = useState(false)
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<LojistaProduct | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // --- Auth + load ---------------------------------------------------------

  const checkAuthAndLoad = useCallback(async () => {
    if (!user?.id) {
      router.replace('/lojista/login')
      return
    }
    try {
      // Reuse the lojista home check to verify the user is a lojista.
      const home = await apiFetch<{ isLojista: boolean }>(`/lojista/home?userId=${user.id}`)
      if (!home.isLojista) {
        router.replace('/lojista/login')
        return
      }
      setIsLojista(true)
      setAuthChecked(true)

      // Load all active products and filter by this lojista's sellerName.
      // (The schema has no sellerId; products are owned via sellerName === user.name.)
      const data = await apiFetch<{ products: ProductListItem[] }>(`/marketplace/products?limit=500`)
      const mine = (data.products || []).filter(
        (p) => (p.sellerName ?? '').trim() === (user.name ?? '').trim()
      )
      setProducts(mine)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.name, router])

  useEffect(() => {
    checkAuthAndLoad()
  }, [checkAuthAndLoad])

  // --- Handlers ------------------------------------------------------------

  const openNew = () => {
    setEditingProduct(null)
    setFormOpen(true)
  }

  const openEdit = (p: ProductListItem) => {
    setEditingProduct({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      category: p.category,
      imageUrl: p.imageUrl,
      images: p.images,
      specifications: p.specifications,
      stock: p.stock,
      cashbackPercent: p.cashbackPercent,
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      sellerName: p.sellerName,
    })
    setFormOpen(true)
  }

  const handleSaved = () => {
    setFormOpen(false)
    setEditingProduct(null)
    void checkAuthAndLoad()
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !user?.id) return
    setDeleting(true)
    try {
      await apiFetch(
        `/marketplace/products/${deleteTarget.id}?userId=${user.id}`,
        { method: 'DELETE' }
      )
      toast.success('Produto excluído.')
      setDeleteTarget(null)
      // Remove from local state immediately
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir produto.')
    } finally {
      setDeleting(false)
    }
  }

  // --- Render: gates -------------------------------------------------------

  if (!authChecked && loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
        <p className="text-sm text-gray-500 mt-2">Carregando produtos...</p>
      </div>
    )
  }

  if (!isLojista) return null

  return (
    <LojistaAppShell>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/lojista/inicio')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px]"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">Meus produtos</h1>
        <Button
          onClick={openNew}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Carregando...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 mb-4">
              <Package className="h-9 w-9 text-gray-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Nenhum produto publicado
            </h2>
            <p className="text-sm text-gray-500 max-w-xs mb-5">
              Cadastre seu primeiro produto com fotos e especificações técnicas
              para começar a vender no marketplace.
            </p>
            <Button
              onClick={openNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Publicar produto
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              {products.length} produto{products.length === 1 ? '' : 's'} publicado
              {products.length === 1 ? '' : 's'}
            </p>
            <div className="space-y-2">
              {products.map((p) => {
                const cover = parseFirstImage(p.images, p.imageUrl)
                const imgCount = countImages(p.images, p.imageUrl)
                const specCount = countSpecs(p.specifications)
                return (
                  <div
                    key={p.id}
                    className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {cover ? (
                        <img
                          src={cover}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
                          {p.name}
                        </h3>
                        {p.isFeatured && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {CATEGORY_LABELS[p.category] || p.category}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-emerald-600">
                          {formatPrice(p.price)}
                        </span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-[10px] text-gray-400 line-through">
                            {formatPrice(p.originalPrice)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-1 mt-1.5">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                          <ImageIcon className="h-2.5 w-2.5 mr-0.5" />
                          {imgCount}
                        </Badge>
                        {specCount > 0 && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            {specCount} espec.
                          </Badge>
                        )}
                        <Badge
                          variant={p.stock > 0 ? 'default' : 'destructive'}
                          className="text-[9px] h-4 px-1.5"
                        >
                          {p.stock > 0 ? `${p.stock} em estoque` : 'Sem estoque'}
                        </Badge>
                        {p.cashbackPercent > 0 && (
                          <Badge className="text-[9px] h-4 px-1.5 bg-emerald-100 text-emerald-700 border-0">
                            {p.cashbackPercent}% CB
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        className="h-8 w-8 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50"
                        aria-label={`Editar ${p.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(p)}
                        className="h-8 w-8 text-gray-600 hover:text-red-700 hover:bg-red-50"
                        aria-label={`Excluir ${p.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Help footer */}
        {!loading && products.length > 0 && (
          <div className="mt-6 flex items-start gap-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-400" />
            <p>
              Dica: produtos com pelo menos 3 fotos e especificações técnicas
              preenchidas têm até 40% mais cliques no marketplace. Arraste fotos
              direto para a área de upload ao criar/editar.
            </p>
          </div>
        )}
      </div>

      {/* ── Form Dialog (create/edit) ───────────────────────────────────── */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) setEditingProduct(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b border-gray-100">
            <DialogTitle className="text-base">
              {editingProduct ? 'Editar produto' : 'Novo produto'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingProduct
                ? 'Atualize as informações, fotos e especificações.'
                : 'Preencha as informações, adicione fotos (até 15) e especificações técnicas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92vh-110px)]">
            {formOpen && (
              <LojistaProductForm
                userId={user?.id || ''}
                product={editingProduct}
                onSaved={handleSaved}
                onCancel={() => {
                  setFormOpen(false)
                  setEditingProduct(null)
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name
                ? `O produto "${deleteTarget.name}" será desativado do marketplace. Esta ação pode ser desfeita pelo administrador.`
                : 'O produto será desativado do marketplace.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LojistaAppShell>
  )
}
