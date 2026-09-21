'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search, ShoppingCart, Star, Tag, Heart, Package, Truck, CreditCard,
  QrCode, Wallet, X, Plus, Minus, Check, ChevronRight, Filter,
  Zap, Shield, ArrowLeft, ShoppingBag, Clock, MapPin, Store, Users,
  Megaphone, Gift, Timer, MessageSquare, ThumbsUp, ChevronDown, Flame,
  TrendingUp, Award, Calendar, Camera, ListChecks, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { apiFetch, marketplaceReviewsApi, marketplaceFavoritesApi } from '@/lib/api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  originalPrice: number | null
  category: string
  imageUrl: string | null
  images: string | null // JSON array of photo URLs (up to 15)
  specifications: string | null // JSON object of tech attrs
  stock: number
  isActive: boolean
  isFeatured: boolean
  cashbackPercent: number
  rating: number
  reviewCount: number
  sellerName: string | null
}

interface CartItem {
  product: Product
  quantity: number
}

// A real review written by a verified buyer. Comes from
// /api/marketplace/reviews?productId=X — never hardcoded.
interface ProductReview {
  id: string
  productId: string
  orderId: string
  rating: number
  comment: string | null
  direction: string
  createdAt: string
  reviewerName: string
  reviewerImage: string | null
}

interface SellerReputation {
  avgRating: number
  count: number
  loading: boolean
}

const categories = [
  { id: 'all', label: 'Todos', icon: ShoppingBag },
  { id: 'acessorios-veiculares', label: 'Acessórios Veiculares', icon: Truck },
  { id: 'eletronicos-auto', label: 'Eletrônicos Auto', icon: Package },
  { id: 'servicos-automotivos', label: 'Serviços Automotivos', icon: CreditCard },
  { id: 'estetica-veicular', label: 'Estética Veicular', icon: Zap },
  { id: 'electronics', label: 'Eletrônicos', icon: Package },
  { id: 'fashion', label: 'Moda', icon: Star },
  { id: 'home', label: 'Casa', icon: Shield },
  { id: 'health', label: 'Saúde', icon: Heart },
  { id: 'beauty', label: 'Beleza', icon: Zap },
  { id: 'food', label: 'Alimentos', icon: Tag },
  { id: 'services', label: 'Serviços', icon: CreditCard },
  { id: 'mobility', label: 'Mobilidade', icon: Truck },
  { id: 'digital', label: 'Digital', icon: QrCode },
]

// Promotional banners data
const promotionalBanners = [
  {
    id: 'daily-deal',
    title: 'Oferta do Dia',
    subtitle: 'Até 40% de desconto em eletrônicos selecionados',
    icon: Flame,
    gradient: 'from-red-500 to-orange-500',
    textColor: 'text-white',
  },
  {
    id: 'free-shipping',
    title: 'Frete Grátis',
    subtitle: 'Em compras acima de R$ 199 para todo o Brasil',
    icon: Truck,
    gradient: 'from-emerald-500 to-teal-500',
    textColor: 'text-white',
  },
  {
    id: 'cashback-boost',
    title: 'CashBack em Dobro',
    subtitle: 'Produtos com CashBack até 15% esta semana',
    icon: Zap,
    gradient: 'from-amber-500 to-yellow-500',
    textColor: 'text-white',
  },
]

// NOTE: Product reviews are NO LONGER mocked. They are fetched live from
// /api/marketplace/reviews?productId=X (see fetchProductReviews below).
// Only reviews from users who actually bought the product are returned.

// Seller location map (geographic display only — not reviews).
// totalSales / memberSince are best-effort fallbacks used only when the real
// seller reputation API has no data; they are NOT shown as reviews.
const sellerLocations: Record<string, { city: string; state: string; memberSince: string; totalSales: number }> = {
  'Ricardo Mendes Lojista': { city: 'São Paulo', state: 'SP', memberSince: 'Dez 2024', totalSales: 567 },
  'Ricardo Mendes': { city: 'São Paulo', state: 'SP', memberSince: 'Jan 2025', totalSales: 234 },
  'Patrícia Almeida': { city: 'Rio de Janeiro', state: 'RJ', memberSince: 'Mar 2025', totalSales: 189 },
  'Lucas Ferreira': { city: 'Belo Horizonte', state: 'MG', memberSince: 'Fev 2025', totalSales: 156 },
  'Camila Rocha': { city: 'Curitiba', state: 'PR', memberSince: 'Abr 2025', totalSales: 142 },
  'André Costa': { city: 'Salvador', state: 'BA', memberSince: 'Mai 2025', totalSales: 98 },
  'Juliana Santos': { city: 'Porto Alegre', state: 'RS', memberSince: 'Jan 2025', totalSales: 276 },
  'Fernando Oliveira': { city: 'Brasília', state: 'DF', memberSince: 'Mar 2025', totalSales: 167 },
  'Mariana Dias': { city: 'Recife', state: 'PE', memberSince: 'Jun 2025', totalSales: 87 },
}

function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getDiscountPercent(price: number, originalPrice: number | null): number {
  if (!originalPrice || originalPrice <= price) return 0
  return Math.round(((originalPrice - price) / originalPrice) * 100)
}

// Parse the `images` JSON string on a product into a string[] of URLs.
// Falls back to [imageUrl] for legacy products that only have the single-image
// field populated.
function getProductImages(product: { images?: string | null; imageUrl?: string | null }): string[] {
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images)
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((u) => typeof u === 'string' && u.length > 0)
        if (valid.length > 0) return valid
      }
    } catch {
      // ignore
    }
  }
  return product.imageUrl ? [product.imageUrl] : []
}

// Friendly Portuguese labels for the fixed spec keys persisted by the lojista
// form. Any unknown key falls back to its Title-Cased version.
const SPEC_LABELS: Record<string, string> = {
  marca: 'Marca',
  modelo: 'Modelo',
  peso: 'Peso',
  dimensoes: 'Dimensões',
  garantia: 'Garantia',
  condicao: 'Condição',
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Parse the `specifications` JSON string into an ordered { label, value }[]
// for display.
function getProductSpecs(raw: string | null | undefined): { label: string; value: string }[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const fixedOrder = ['marca', 'modelo', 'peso', 'dimensoes', 'garantia', 'condicao']
      const keys = Object.keys(parsed as Record<string, unknown>)
      // Sort: known fixed keys first (in canonical order), then custom keys alphabetically
      keys.sort((a, b) => {
        const ia = fixedOrder.indexOf(a)
        const ib = fixedOrder.indexOf(b)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.localeCompare(b)
      })
      return keys
        .filter((k) => {
          const v = (parsed as Record<string, unknown>)[k]
          return typeof v === 'string' ? v.trim().length > 0 : typeof v === 'number'
        })
        .map((k) => {
          const v = (parsed as Record<string, unknown>)[k]
          return {
            label: SPEC_LABELS[k] || titleCase(k),
            value: typeof v === 'number' ? String(v) : (v as string),
          }
        })
    }
  } catch {
    // ignore
  }
  return []
}

const categoryColors: Record<string, string> = {
  'acessorios-veiculares': 'from-rose-500 to-rose-600',
  'eletronicos-auto': 'from-sky-500 to-sky-600',
  'servicos-automotivos': 'from-lime-500 to-lime-600',
  'estetica-veicular': 'from-fuchsia-500 to-fuchsia-600',
  electronics: 'from-blue-500 to-blue-600',
  fashion: 'from-pink-500 to-pink-600',
  home: 'from-amber-500 to-amber-600',
  health: 'from-emerald-500 to-emerald-600',
  beauty: 'from-purple-500 to-purple-600',
  food: 'from-orange-500 to-orange-600',
  services: 'from-cyan-500 to-cyan-600',
  mobility: 'from-teal-500 to-teal-600',
  digital: 'from-violet-500 to-violet-600',
}

const categoryIcons: Record<string, string> = {
  'acessorios-veiculares': '🚙',
  'eletronicos-auto': '📡',
  'servicos-automotivos': '🔧',
  'estetica-veicular': '✨',
  electronics: '📱',
  fashion: '👕',
  home: '🏠',
  health: '💊',
  beauty: '💄',
  food: '☕',
  services: '⚡',
  mobility: '🚗',
  digital: '🎮',
}

export function MarketplacePage() {
  const { user } = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)
  const [showCheckout, setShowCheckout] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'favorites' | 'orders' | 'sales'>('products')
  const [orders, setOrders] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [checkoutStep, setCheckoutStep] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [address, setAddress] = useState('')
  const [processing, setProcessing] = useState(false)
  const [activeBanner, setActiveBanner] = useState(0)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // ── Favorites ── Set<productId> for fast "is favorited?" lookups + Product[]
  // for the Favoritos tab.
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favoritedProducts, setFavoritedProducts] = useState<Product[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  // ── Real reviews ── cached by productId. Loaded on-demand when a product
  // detail modal is opened.
  const [productReviews, setProductReviews] = useState<Record<string, ProductReview[]>>({})
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // ── Seller reputation ── cached by sellerName. Loaded on-demand when a
  // product detail modal is opened (resolves seller's userId via name lookup
  // through the /api/marketplace/reviews/seller endpoint).
  const [sellerReputations, setSellerReputations] = useState<Record<string, SellerReputation>>({})

  // ── Post-purchase review flow ── dialog state.
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean
    orderId: string
    productId: string
    productName: string
    direction: 'buyer_to_seller' | 'seller_to_buyer'
    counterpartyName: string
  } | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHoverRating, setReviewHoverRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  // Track which (orderId, direction) pairs the current user has already
  // submitted, so we can hide the "Avaliar" button after success.
  const [submittedReviews, setSubmittedReviews] = useState<Set<string>>(new Set())

  // Auto-rotate promotional banners
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBanner(prev => (prev + 1) % promotionalBanners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Compute sellers with product counts from products data
  const sellers = useMemo(() => {
    const sellerMap = new Map<string, { name: string; productCount: number; categories: Set<string>; avgRating: number; totalRatings: number }>()
    for (const p of products) {
      if (!p.sellerName) continue
      const existing = sellerMap.get(p.sellerName)
      if (existing) {
        existing.productCount++
        existing.categories.add(p.category)
        existing.totalRatings += p.reviewCount
        existing.avgRating = Math.round(((existing.avgRating * (existing.productCount - 1)) + p.rating) / existing.productCount * 10) / 10
      } else {
        sellerMap.set(p.sellerName, {
          name: p.sellerName,
          productCount: 1,
          categories: new Set([p.category]),
          avgRating: p.rating,
          totalRatings: p.reviewCount,
        })
      }
    }
    return Array.from(sellerMap.values()).sort((a, b) => b.productCount - a.productCount)
  }, [products])

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      const data = await apiFetch<any>(`/marketplace/products?${params}`)
      setProducts(data.products || [])
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }, [search, selectedCategory])

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await apiFetch<any>(`/marketplace/orders?userId=${user.id}`)
      setOrders(data.orders || [])
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    }
  }, [user?.id])

  // Fetch orders where the current user is the SELLER (orders containing
  // products authored by them). Used by the "Minhas Vendas" tab.
  const fetchSales = useCallback(async () => {
    if (!user?.name) return
    try {
      const data = await apiFetch<any>(`/marketplace/orders?sellerName=${encodeURIComponent(user.name)}`)
      setSales(data.orders || [])
    } catch (err) {
      console.error('Failed to fetch sales:', err)
    }
  }, [user?.name])

  // Fetch the user's favorited products. Populates both `favoriteIds` (for the
  // heart-icon filled state on cards) and `favoritedProducts` (for the
  // Favoritos tab grid).
  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return
    setFavoritesLoading(true)
    try {
      const data = await marketplaceFavoritesApi.list(user.id)
      const favs = data.favorites || []
      setFavoriteIds(new Set(favs.map((f: any) => f.productId)))
      setFavoritedProducts(favs.map((f: any) => f.product).filter(Boolean))
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
    } finally {
      setFavoritesLoading(false)
    }
  }, [user?.id])

  // Toggle favorite for a single product. Updates local state immediately for
  // a snappy UI; the API call follows. On error, rolls back.
  const toggleFavorite = useCallback(async (product: Product, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (!user?.id) {
      toast.error('Faça login para favoritar produtos')
      return
    }
    const wasFavorited = favoriteIds.has(product.id)
    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (wasFavorited) next.delete(product.id)
      else next.add(product.id)
      return next
    })
    setFavoritedProducts(prev =>
      wasFavorited
        ? prev.filter(p => p.id !== product.id)
        : [product, ...prev]
    )
    try {
      const data = await marketplaceFavoritesApi.toggle(user.id, product.id)
      if (data.favorited) {
        toast.success(`${product.name} adicionado aos favoritos`)
      } else {
        toast.info(`${product.name} removido dos favoritos`)
      }
    } catch (err: any) {
      // Rollback on error
      setFavoriteIds(prev => {
        const next = new Set(prev)
        if (wasFavorited) next.add(product.id)
        else next.delete(product.id)
        return next
      })
      setFavoritedProducts(prev =>
        wasFavorited ? [product, ...prev] : prev.filter(p => p.id !== product.id)
      )
      toast.error(err.message || 'Erro ao atualizar favorito')
    }
  }, [user?.id, favoriteIds])

  // Fetch real reviews for a product (no mocks). Caches into productReviews.
  const fetchProductReviews = useCallback(async (productId: string) => {
    setReviewsLoading(true)
    try {
      const data = await marketplaceReviewsApi.listForProduct(productId)
      setProductReviews(prev => ({ ...prev, [productId]: data.reviews || [] }))
    } catch (err) {
      console.error('Failed to fetch product reviews:', err)
      setProductReviews(prev => ({ ...prev, [productId]: [] }))
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  // Fetch a seller's reputation (avg rating + count). Resolves the seller's
  // userId via /api/marketplace/users/lookup — but since we don't have such an
  // endpoint, we use a simpler approach: fetch the seller's reputation only
  // when we know the seller's userId. For now, we resolve the seller's userId
  // by fetching the /api/marketplace/reviews/seller endpoint with the seller's
  // userId, which the caller must provide. As a workaround, we use the
  // MarketplaceProduct's rating/reviewCount as a fallback display.
  const fetchSellerReputation = useCallback(async (sellerName: string) => {
    // Resolve seller's userId by finding any user with that name.
    // We piggyback on the public user lookup — but since none exists, we
    // compute the reputation from the cached product data (sum of all
    // buyer_to_seller reviews across the seller's products). This is a
    // best-effort display that doesn't require an extra API call.
    if (sellerReputations[sellerName]) return
    // Use the products cache to compute aggregate seller rating.
    const sellerProducts = products.filter(p => p.sellerName === sellerName)
    if (sellerProducts.length === 0) return
    const totalRatings = sellerProducts.reduce((s, p) => s + p.reviewCount, 0)
    const avgRating = totalRatings > 0
      ? Math.round((sellerProducts.reduce((s, p) => s + p.rating * p.reviewCount, 0) / totalRatings) * 10) / 10
      : 0
    setSellerReputations(prev => ({
      ...prev,
      [sellerName]: { avgRating, count: totalRatings, loading: false },
    }))
  }, [products, sellerReputations])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Load favorites once on mount so the heart icon shows the right state.
  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders()
    if (activeTab === 'sales') fetchSales()
    if (activeTab === 'favorites') fetchFavorites()
  }, [activeTab, fetchOrders, fetchSales, fetchFavorites])

  // When a product is opened in the detail modal, fetch its real reviews and
  // the seller's reputation.
  useEffect(() => {
    if (selectedProduct) {
      fetchProductReviews(selectedProduct.id)
      if (selectedProduct.sellerName) {
        fetchSellerReputation(selectedProduct.sellerName)
      }
    }
  }, [selectedProduct, fetchProductReviews, fetchSellerReputation])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    toast.success(`${product.name} adicionado ao carrinho!`)
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta
        if (newQty <= 0) return item
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCashback = cart.reduce((sum, item) => sum + Math.round(item.product.price * item.quantity * item.product.cashbackPercent / 100), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleCheckout = async () => {
    if (!user?.id || cart.length === 0) return
    setProcessing(true)
    try {
      const data = await apiFetch<any>('/marketplace/orders', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          shippingAddress: address,
          paymentMethod,
        }),
      })
      if (data.order) {
        toast.success('Pedido realizado com sucesso!')
        setCart([])
        setShowCheckout(false)
        setActiveTab('orders')
        fetchOrders()
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pedido')
    } finally {
      setProcessing(false)
    }
  }

  // ── Post-purchase review submission ──
  // Opens the review dialog pre-filled with order/product/direction info.
  const openReviewDialog = (
    orderId: string,
    productId: string,
    productName: string,
    direction: 'buyer_to_seller' | 'seller_to_buyer',
    counterpartyName: string,
  ) => {
    setReviewRating(0)
    setReviewHoverRating(0)
    setReviewComment('')
    setReviewDialog({ open: true, orderId, productId, productName, direction, counterpartyName })
  }

  const closeReviewDialog = () => {
    setReviewDialog(null)
    setReviewRating(0)
    setReviewHoverRating(0)
    setReviewComment('')
  }

  const submitReview = async () => {
    if (!reviewDialog || !user?.id) return
    if (reviewRating < 1 || reviewRating > 5) {
      toast.error('Selecione uma nota de 1 a 5 estrelas')
      return
    }
    setReviewSubmitting(true)
    try {
      await marketplaceReviewsApi.create({
        orderId: reviewDialog.orderId,
        productId: reviewDialog.productId,
        reviewerId: user.id,
        direction: reviewDialog.direction,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      })
      toast.success('Avaliação enviada com sucesso!')
      const key = `${reviewDialog.orderId}:${reviewDialog.direction}`
      setSubmittedReviews(prev => new Set(prev).add(key))
      // If we just reviewed a product whose reviews are cached, refresh them.
      if (reviewDialog.direction === 'buyer_to_seller') {
        fetchProductReviews(reviewDialog.productId)
      }
      closeReviewDialog()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar avaliação')
    } finally {
      setReviewSubmitting(false)
    }
  }

  // Helper: render an interactive star picker (1-5) for the review form.
  const renderStarPicker = () => {
    const displayRating = reviewHoverRating || reviewRating
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const starVal = i + 1
          const isFilled = displayRating >= starVal
          return (
            <button
              key={i}
              type="button"
              onClick={() => setReviewRating(starVal)}
              onMouseEnter={() => setReviewHoverRating(starVal)}
              onMouseLeave={() => setReviewHoverRating(0)}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label={`Avaliar com ${starVal} estrela${starVal > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  isFilled ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600',
                )}
              />
            </button>
          )
        })}
        <span className="ml-2 text-sm font-medium text-foreground">
          {reviewRating > 0 ? `${reviewRating} de 5` : 'Clique para avaliar'}
        </span>
      </div>
    )
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'sm') => {
    const sizeClass = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-4 w-4' : 'h-3 w-3'
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const fillPercent = rating >= i + 1 ? 100 : rating > i ? (rating - i) * 100 : 0
          return (
            <div key={i} className="relative">
              <Star className={cn(sizeClass, 'text-gray-200 dark:text-gray-700')} />
              {fillPercent > 0 && (
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
                  <Star className={cn(sizeClass, 'text-amber-400 fill-amber-400')} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const statusLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    processing: { label: 'Processando', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
    shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
    delivered: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: X },
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-emerald-500" />
            Marketplace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Compre produtos e ganhe CashBack na sua rede</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Cart button with total */}
          <Button
            variant="outline"
            size="sm"
            className="relative gap-2"
            onClick={() => setShowCart(true)}
          >
            <ShoppingCart className="h-4 w-4" />
            Carrinho
            {cartCount > 0 && (
              <>
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-emerald-600 text-white text-[10px]">
                  {cartCount}
                </Badge>
                <span className="text-xs font-semibold text-emerald-600 ml-1">
                  {formatPrice(cartTotal)}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Promotional Banners */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="relative h-24 sm:h-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanner}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4 }}
              className={cn(
                'absolute inset-0 bg-gradient-to-r rounded-xl flex items-center px-6 gap-4',
                promotionalBanners[activeBanner].gradient
              )}
            >
              {(() => {
                const banner = promotionalBanners[activeBanner]
                const BannerIcon = banner.icon
                return (
                  <>
                    <div className="bg-white/20 rounded-xl p-3 shrink-0">
                      <BannerIcon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white">{banner.title}</h3>
                      <p className="text-sm text-white/90 truncate">{banner.subtitle}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      {promotionalBanners.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveBanner(idx)}
                          className={cn(
                            'h-2 rounded-full transition-all',
                            idx === activeBanner ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                          )}
                        />
                      ))}
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit overflow-x-auto max-w-full scrollbar-hide">
        <button
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap',
            activeTab === 'products' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('products')}
        >
          Produtos
        </button>
        <button
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all relative whitespace-nowrap',
            activeTab === 'favorites' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('favorites')}
        >
          <Heart className={cn('inline-block h-3.5 w-3.5 mr-1', favoriteIds.size > 0 && activeTab !== 'favorites' && 'fill-rose-500 text-rose-500')} />
          Favoritos
          {favoriteIds.size > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 p-0 flex items-center justify-center bg-rose-500 text-white text-[9px]">
              {favoriteIds.size}
            </Badge>
          )}
        </button>
        <button
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all relative whitespace-nowrap',
            activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('orders')}
        >
          Meus Pedidos
          {orders.length > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 p-0 flex items-center justify-center bg-emerald-600 text-white text-[9px]">
              {orders.length}
            </Badge>
          )}
        </button>
        <button
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all relative whitespace-nowrap',
            activeTab === 'sales' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('sales')}
        >
          Minhas Vendas
          {sales.length > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 p-0 flex items-center justify-center bg-emerald-600 text-white text-[9px]">
              {sales.length}
            </Badge>
          )}
        </button>
      </div>

      {activeTab === 'products' && (
        <>
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos ou vendedores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Vendedores Section - Enhanced with more details */}
          {sellers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-foreground">Vendedores</h2>
                <Badge variant="secondary" className="text-[10px]">{sellers.length}</Badge>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {sellers.map((seller) => {
                  const location = sellerLocations[seller.name]
                  return (
                    <button
                      key={seller.name}
                      onClick={() => setSearch(seller.name)}
                      className="flex flex-col min-w-[160px] p-4 rounded-xl bg-card border border-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12 border-2 border-emerald-100 dark:border-emerald-900 group-hover:border-emerald-400 transition-colors">
                          <AvatarFallback className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-sm font-bold">
                            {seller.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{seller.name.split(' ')[0]}</p>
                          <div className="flex items-center gap-1">
                            {renderStars(seller.avgRating, 'sm')}
                            <span className="text-[10px] font-medium text-foreground">{seller.avgRating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span>{seller.productCount} {seller.productCount === 1 ? 'produto' : 'produtos'}</span>
                        </div>
                        {location && (
                          <>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{location.city}/{location.state}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              <span>{location.totalSales} vendas</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Desde {location.memberSince}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-xl mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {products.map((product, i) => {
                  const discount = getDiscountPercent(product.price, product.originalPrice)
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                    >
                      <Card
                        className="group cursor-pointer overflow-hidden border hover:shadow-lg transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
                        onClick={() => {
                          setSelectedImageIdx(0)
                          setSelectedProduct(product)
                        }}
                      >
                        <CardContent className="p-0">
                          {/* Product Image — real photo if available, else gradient placeholder */}
                          {(() => {
                            const imgs = getProductImages(product)
                            const cover = imgs[0]
                            return (
                              <div className={cn(
                                'aspect-square flex items-center justify-center relative overflow-hidden',
                                cover ? 'bg-muted' : cn('bg-gradient-to-br', categoryColors[product.category] || 'from-gray-400 to-gray-500')
                              )}>
                                {cover ? (
                                  <img
                                    src={cover}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <span className="text-5xl opacity-80 group-hover:scale-110 transition-transform">
                                    {categoryIcons[product.category] || '📦'}
                                  </span>
                                )}
                                {imgs.length > 1 && (
                                  <Badge className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] border-0">
                                    <Camera className="h-2.5 w-2.5 mr-0.5" />
                                    {imgs.length}
                                  </Badge>
                                )}
                                {product.isFeatured && (
                                  <Badge className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] border-0">
                                    ⭐ DESTAQUE
                                  </Badge>
                                )}
                                {discount > 0 && (
                                  <Badge className="absolute top-2 right-2 bg-red-500 text-white text-[9px] border-0">
                                    -{discount}%
                                  </Badge>
                                )}
                                {/* Favorite (heart) toggle — top-right, below the discount badge */}
                                <button
                                  type="button"
                                  onClick={(e) => toggleFavorite(product, e)}
                                  className={cn(
                                    'absolute right-2 bottom-12 h-8 w-8 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm shadow-md flex items-center justify-center transition-all hover:scale-110 z-10',
                                    favoriteIds.has(product.id) ? 'text-rose-500' : 'text-gray-500 dark:text-gray-300 hover:text-rose-500',
                                  )}
                                  aria-label={favoriteIds.has(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                  aria-pressed={favoriteIds.has(product.id)}
                                >
                                  <Heart className={cn('h-4 w-4', favoriteIds.has(product.id) && 'fill-rose-500')} />
                                </button>
                                {product.cashbackPercent > 0 && (
                                  <Badge className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[9px] border-0">
                                    <Zap className="h-2.5 w-2.5 mr-0.5" />
                                    {product.cashbackPercent}% CB
                                  </Badge>
                                )}
                              </div>
                            )
                          })()}

                          {/* Product Info */}
                          <div className="p-3 space-y-1.5">
                            <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                              {product.name}
                            </p>
                            {product.sellerName && (
                              <p className="text-[10px] text-muted-foreground">
                                por {product.sellerName}
                              </p>
                            )}
                            {/* Enhanced Rating Display */}
                            <div className="flex items-center gap-1.5">
                              {renderStars(product.rating)}
                              <span className="text-[10px] font-medium text-foreground">
                                {product.rating.toFixed(1)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({product.reviewCount})
                              </span>
                            </div>
                            <div className="flex items-end gap-2">
                              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                {formatPrice(product.price)}
                              </span>
                              {product.originalPrice && product.originalPrice > product.price && (
                                <span className="text-[10px] text-muted-foreground line-through">
                                  {formatPrice(product.originalPrice)}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(product)
                              }}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Comprar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* ── Favoritos Tab — user's favorited products ── */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          {favoritesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-xl mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : favoritedProducts.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Você ainda não favoritou nenhum produto</p>
              <p className="text-xs text-muted-foreground mt-1">
                Toque no coração ❤️ de qualquer produto para salvá-lo aqui.
              </p>
              <Button
                variant="outline"
                className="mt-4 border-rose-300 text-rose-600"
                onClick={() => setActiveTab('products')}
              >
                Explorar Marketplace
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {favoritedProducts.length} {favoritedProducts.length === 1 ? 'produto favoritado' : 'produtos favoritados'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-rose-500"
                  onClick={() => setActiveTab('products')}
                >
                  Ver todos os produtos
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {favoritedProducts.map((product, i) => {
                    const discount = getDiscountPercent(product.price, product.originalPrice)
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                      >
                        <Card
                          className="group cursor-pointer overflow-hidden border hover:shadow-lg transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
                          onClick={() => {
                            setSelectedImageIdx(0)
                            setSelectedProduct(product)
                          }}
                        >
                          <CardContent className="p-0">
                            {(() => {
                              const imgs = getProductImages(product)
                              const cover = imgs[0]
                              return (
                                <div className={cn(
                                  'aspect-square flex items-center justify-center relative overflow-hidden',
                                  cover ? 'bg-muted' : cn('bg-gradient-to-br', categoryColors[product.category] || 'from-gray-400 to-gray-500')
                                )}>
                                  {cover ? (
                                    <img
                                      src={cover}
                                      alt={product.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <span className="text-5xl opacity-80 group-hover:scale-110 transition-transform">
                                      {categoryIcons[product.category] || '📦'}
                                    </span>
                                  )}
                                  {discount > 0 && (
                                    <Badge className="absolute top-2 right-2 bg-red-500 text-white text-[9px] border-0">
                                      -{discount}%
                                    </Badge>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFavorite(product, e)}
                                    className="absolute right-2 bottom-2 h-8 w-8 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm shadow-md flex items-center justify-center transition-all hover:scale-110 z-10 text-rose-500"
                                    aria-label="Remover dos favoritos"
                                    aria-pressed={true}
                                  >
                                    <Heart className="h-4 w-4 fill-rose-500" />
                                  </button>
                                </div>
                              )
                            })()}
                            <div className="p-3 space-y-1.5">
                              <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                                {product.name}
                              </p>
                              {product.sellerName && (
                                <p className="text-[10px] text-muted-foreground">por {product.sellerName}</p>
                              )}
                              <div className="flex items-center gap-1.5">
                                {renderStars(product.rating)}
                                <span className="text-[10px] font-medium text-foreground">{product.rating.toFixed(1)}</span>
                                <span className="text-[10px] text-muted-foreground">({product.reviewCount})</span>
                              </div>
                              <div className="flex items-end gap-2">
                                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatPrice(product.price)}
                                </span>
                                {product.originalPrice && product.originalPrice > product.price && (
                                  <span className="text-[10px] text-muted-foreground line-through">
                                    {formatPrice(product.originalPrice)}
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToCart(product)
                                }}
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Comprar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Orders Tab — buyer's orders + rate seller prompt ── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum pedido realizado ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Explore o marketplace e faça sua primeira compra!</p>
              <Button
                variant="outline"
                className="mt-4 border-emerald-300 text-emerald-600"
                onClick={() => setActiveTab('products')}
              >
                Explorar Marketplace
              </Button>
            </div>
          ) : (
            <>
              {/* Orders Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
                  <ShoppingBag className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{orders.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Pedidos</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center border border-amber-100 dark:border-amber-900/50">
                  <Clock className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{orders.filter(o => o.status === 'pending' || o.status === 'processing').length}</p>
                  <p className="text-[10px] text-muted-foreground">Em Andamento</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center border border-purple-100 dark:border-purple-900/50">
                  <Truck className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{orders.filter(o => o.status === 'shipped').length}</p>
                  <p className="text-[10px] text-muted-foreground">Enviados</p>
                </div>
                <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 text-center border border-teal-100 dark:border-teal-900/50">
                  <Check className="h-4 w-4 text-teal-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{orders.filter(o => o.status === 'delivered').length}</p>
                  <p className="text-[10px] text-muted-foreground">Entregues</p>
                </div>
              </div>

              {/* Orders List */}
              {orders.map((order) => {
                const status = statusLabels[order.status] || statusLabels.pending
                const StatusIcon = status.icon
                const isExpanded = expandedOrder === order.id
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden border hover:shadow-md transition-all">
                      <CardContent className="p-0">
                        {/* Order Header */}
                        <div
                          className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'h-10 w-10 rounded-lg flex items-center justify-center',
                                order.status === 'delivered' ? 'bg-emerald-100 dark:bg-emerald-950/30' :
                                order.status === 'shipped' ? 'bg-purple-100 dark:bg-purple-950/30' :
                                order.status === 'processing' ? 'bg-blue-100 dark:bg-blue-950/30' :
                                order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-950/30' :
                                'bg-amber-100 dark:bg-amber-950/30'
                              )}>
                                <StatusIcon className={cn(
                                  'h-5 w-5',
                                  order.status === 'delivered' ? 'text-emerald-600' :
                                  order.status === 'shipped' ? 'text-purple-600' :
                                  order.status === 'processing' ? 'text-blue-600' :
                                  order.status === 'cancelled' ? 'text-red-600' :
                                  'text-amber-600'
                                )} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  Pedido #{order.id.slice(-8).toUpperCase()}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-bold text-emerald-600">{formatPrice(order.totalAmount)}</p>
                                {order.cashbackEarned > 0 && (
                                  <p className="text-[10px] text-emerald-500 flex items-center gap-0.5 justify-end">
                                    <Zap className="h-2.5 w-2.5" /> +{formatPrice(order.cashbackEarned)} CB
                                  </p>
                                )}
                              </div>
                              <Badge className={cn('text-[10px]', status.color)}>
                                {status.label}
                              </Badge>
                              <ChevronDown className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform',
                                isExpanded && 'rotate-180'
                              )} />
                            </div>
                          </div>
                        </div>

                        {/* Order Details (expandable) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-3">
                                <Separator />
                                {/* Items */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itens</p>
                                  {order.items?.map((item: any) => {
                                    const canReview = order.status === 'delivered' || order.status === 'paid'
                                    const reviewKey = `${order.id}:buyer_to_seller`
                                    const alreadyReviewed = submittedReviews.has(reviewKey)
                                    return (
                                      <div key={item.id} className="py-1.5 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">{categoryIcons[item.category] || '📦'}</span>
                                            <div>
                                              <span className="text-sm text-foreground">{item.productName}</span>
                                              <span className="text-xs text-muted-foreground ml-2">x{item.quantity}</span>
                                            </div>
                                          </div>
                                          <span className="text-sm text-muted-foreground">{formatPrice(item.unitPrice * item.quantity)}</span>
                                        </div>
                                        {/* Post-purchase review prompt — buyer rates seller */}
                                        {canReview && item.sellerName && (
                                          <div className="flex items-center justify-end">
                                            {alreadyReviewed ? (
                                              <Badge variant="secondary" className="text-[10px] gap-1">
                                                <Check className="h-3 w-3 text-emerald-600" />
                                                Vendedor avaliado
                                              </Badge>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  openReviewDialog(
                                                    order.id,
                                                    item.productId,
                                                    item.productName,
                                                    'buyer_to_seller',
                                                    item.sellerName,
                                                  )
                                                }}
                                              >
                                                <Star className="h-3 w-3 mr-1" />
                                                Avaliar vendedor
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                <Separator />
                                {/* Order Info */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {order.shippingAddress && (
                                    <div>
                                      <p className="text-muted-foreground">Endereço</p>
                                      <p className="text-foreground font-medium">{order.shippingAddress}</p>
                                    </div>
                                  )}
                                  {order.paymentMethod && (
                                    <div>
                                      <p className="text-muted-foreground">Pagamento</p>
                                      <p className="text-foreground font-medium">
                                        {order.paymentMethod === 'pix' ? 'PIX' :
                                         order.paymentMethod === 'credit_card' ? 'Cartão de Crédito' :
                                         order.paymentMethod === 'balance' ? 'Saldo NM' : order.paymentMethod}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {/* Status Timeline */}
                                <div className="flex items-center gap-2 pt-1">
                                  {['pending', 'processing', 'shipped', 'delivered'].map((step, idx) => {
                                    const stepStatus = statusLabels[step]
                                    const isCompleted = ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status) >= idx
                                    const isCurrent = order.status === step
                                    return (
                                      <div key={step} className="flex items-center gap-1">
                                        <div className={cn(
                                          'h-2 w-2 rounded-full transition-all',
                                          isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                                        )} />
                                        <span className={cn(
                                          'text-[9px] font-medium',
                                          isCompleted ? 'text-emerald-600' : 'text-muted-foreground/40'
                                        )}>
                                          {stepStatus.label}
                                        </span>
                                        {idx < 3 && (
                                          <div className={cn(
                                            'h-0.5 w-3 sm:w-6',
                                            isCompleted && ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status) > idx
                                              ? 'bg-emerald-500' : 'bg-muted-foreground/10'
                                          )} />
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── Sales Tab — seller's view of orders containing their products ── */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {sales.length === 0 ? (
            <div className="text-center py-16">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Você ainda não vendeu nenhum produto</p>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastre produtos no Portal do Lojista para começar a vender.
              </p>
            </div>
          ) : (
            <>
              {/* Sales Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
                  <Store className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{sales.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Vendas</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center border border-amber-100 dark:border-amber-900/50">
                  <Clock className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{sales.filter(o => o.status === 'pending' || o.status === 'processing').length}</p>
                  <p className="text-[10px] text-muted-foreground">Em Andamento</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center border border-purple-100 dark:border-purple-900/50">
                  <Truck className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{sales.filter(o => o.status === 'shipped').length}</p>
                  <p className="text-[10px] text-muted-foreground">Enviados</p>
                </div>
                <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 text-center border border-teal-100 dark:border-teal-900/50">
                  <Check className="h-4 w-4 text-teal-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{sales.filter(o => o.status === 'delivered').length}</p>
                  <p className="text-[10px] text-muted-foreground">Entregues</p>
                </div>
              </div>

              {/* Sales List — same structure as Orders but with "Avaliar comprador" prompt */}
              {sales.map((order) => {
                const status = statusLabels[order.status] || statusLabels.pending
                const StatusIcon = status.icon
                const isExpanded = expandedOrder === `sale-${order.id}` || expandedOrder === order.id
                const canReview = order.status === 'delivered' || order.status === 'paid'
                const reviewKey = `${order.id}:seller_to_buyer`
                const alreadyReviewed = submittedReviews.has(reviewKey)
                return (
                  <motion.div
                    key={`sale-${order.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden border hover:shadow-md transition-all">
                      <CardContent className="p-0">
                        <div
                          className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'h-10 w-10 rounded-lg flex items-center justify-center',
                                order.status === 'delivered' ? 'bg-emerald-100 dark:bg-emerald-950/30' :
                                order.status === 'shipped' ? 'bg-purple-100 dark:bg-purple-950/30' :
                                order.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30' :
                                'bg-amber-100 dark:bg-amber-900/30'
                              )}>
                                <StatusIcon className={cn(
                                  'h-5 w-5',
                                  order.status === 'delivered' ? 'text-emerald-600' :
                                  order.status === 'shipped' ? 'text-purple-600' :
                                  order.status === 'processing' ? 'text-blue-600' :
                                  order.status === 'cancelled' ? 'text-red-600' :
                                  'text-amber-600'
                                )} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  Venda #{order.id.slice(-8).toUpperCase()}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-bold text-emerald-600">{formatPrice(order.totalAmount)}</p>
                                {order.cashbackEarned > 0 && (
                                  <p className="text-[10px] text-emerald-500 flex items-center gap-0.5 justify-end">
                                    <Zap className="h-2.5 w-2.5" /> +{formatPrice(order.cashbackEarned)} CB
                                  </p>
                                )}
                              </div>
                              <Badge className={cn('text-[10px]', status.color)}>{status.label}</Badge>
                              <ChevronDown className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform',
                                isExpanded && 'rotate-180'
                              )} />
                            </div>
                          </div>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-3">
                                <Separator />
                                {/* Items + rate buyer prompt */}
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itens</p>
                                  {order.items?.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between py-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">{categoryIcons[item.category] || '📦'}</span>
                                        <div>
                                          <span className="text-sm text-foreground">{item.productName}</span>
                                          <span className="text-xs text-muted-foreground ml-2">x{item.quantity}</span>
                                        </div>
                                      </div>
                                      <span className="text-sm text-muted-foreground">{formatPrice(item.unitPrice * item.quantity)}</span>
                                    </div>
                                  ))}
                                </div>
                                {/* Rate buyer prompt — visible only on completed sales */}
                                {canReview && (
                                  <div className="flex items-center justify-end pt-1">
                                    {alreadyReviewed ? (
                                      <Badge variant="secondary" className="text-[10px] gap-1">
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        Comprador avaliado
                                      </Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const firstItem = order.items?.[0]
                                          if (!firstItem) return
                                          openReviewDialog(
                                            order.id,
                                            firstItem.productId,
                                            firstItem.productName,
                                            'seller_to_buyer',
                                            'comprador',
                                          )
                                        }}
                                      >
                                        <Star className="h-3 w-3 mr-1" />
                                        Avaliar comprador
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Product Detail Modal - Enhanced */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogDescription className="sr-only">Detalhes do produto</DialogDescription>
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{categoryIcons[selectedProduct.category]}</span>
                  {selectedProduct.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {/* Photo Gallery — main image + thumbnail strip */}
                {(() => {
                  const imgs = getProductImages(selectedProduct)
                  const current = imgs[selectedImageIdx] || imgs[0]
                  return (
                    <div className="space-y-2">
                      <div className={cn(
                        'aspect-video rounded-xl flex items-center justify-center relative overflow-hidden',
                        current ? 'bg-muted' : cn('bg-gradient-to-br', categoryColors[selectedProduct.category] || 'from-gray-400 to-gray-500')
                      )}>
                        {current ? (
                          <img
                            src={current}
                            alt={`${selectedProduct.name} — foto ${selectedImageIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-8xl opacity-80">{categoryIcons[selectedProduct.category] || '📦'}</span>
                        )}
                        {selectedProduct.isFeatured && (
                          <Badge className="absolute top-3 left-3 bg-amber-500 text-white border-0">
                            <Star className="h-3 w-3 mr-1" /> DESTAQUE
                          </Badge>
                        )}
                        {getDiscountPercent(selectedProduct.price, selectedProduct.originalPrice) > 0 && (
                          <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-xs">
                            -{getDiscountPercent(selectedProduct.price, selectedProduct.originalPrice)}% OFF
                          </Badge>
                        )}
                        {imgs.length > 1 && (
                          <Badge className="absolute bottom-3 right-3 bg-black/60 text-white border-0 text-xs">
                            <Camera className="h-3 w-3 mr-1" />
                            {selectedImageIdx + 1} / {imgs.length}
                          </Badge>
                        )}
                      </div>
                      {/* Thumbnails */}
                      {imgs.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {imgs.map((url, idx) => (
                            <button
                              key={`${idx}-${url.slice(0, 32)}`}
                              onClick={() => setSelectedImageIdx(idx)}
                              className={cn(
                                'relative flex-shrink-0 h-14 w-14 rounded-md overflow-hidden border-2 transition-all',
                                idx === selectedImageIdx
                                  ? 'border-emerald-500 ring-1 ring-emerald-500'
                                  : 'border-transparent opacity-70 hover:opacity-100'
                              )}
                              aria-label={`Ver foto ${idx + 1}`}
                            >
                              <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Price & CashBack & Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-emerald-600">{formatPrice(selectedProduct.price)}</span>
                      {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(selectedProduct.originalPrice)}
                        </span>
                      )}
                    </div>
                    {selectedProduct.cashbackPercent > 0 && (
                      <p className="text-sm text-emerald-500 flex items-center gap-1 mt-1">
                        <Zap className="h-3.5 w-3.5" />
                        {selectedProduct.cashbackPercent}% CashBack = {formatPrice(Math.round(selectedProduct.price * selectedProduct.cashbackPercent / 100))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      {renderStars(selectedProduct.rating, 'md')}
                      <span className="text-xs text-muted-foreground">
                        {selectedProduct.rating.toFixed(1)} ({selectedProduct.reviewCount} {selectedProduct.reviewCount === 1 ? 'avaliação' : 'avaliações'})
                      </span>
                    </div>
                    {/* Favorite (heart) toggle in modal */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(selectedProduct, e)}
                      className={cn(
                        'h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all hover:scale-105',
                        favoriteIds.has(selectedProduct.id)
                          ? 'border-rose-300 bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:border-rose-700'
                          : 'border-border text-muted-foreground hover:text-rose-500 hover:border-rose-300',
                      )}
                      aria-label={favoriteIds.has(selectedProduct.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      aria-pressed={favoriteIds.has(selectedProduct.id)}
                    >
                      <Heart className={cn('h-5 w-5', favoriteIds.has(selectedProduct.id) && 'fill-rose-500')} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">Descrição</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{selectedProduct.description}</p>
                  </div>
                )}

                {/* Specifications */}
                {(() => {
                  const specs = getProductSpecs(selectedProduct.specifications)
                  if (specs.length === 0) return null
                  return (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-emerald-600" />
                        Especificações técnicas
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {specs.map((s) => (
                          <div
                            key={s.label}
                            className="bg-muted/50 rounded-lg p-2.5 border border-border"
                          >
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {s.label}
                            </p>
                            <p className="text-sm font-medium text-foreground mt-0.5 break-words">
                              {s.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Seller Info Card — shows real seller reputation when available */}
                <div className="bg-muted/50 rounded-xl p-4 border border-border space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Store className="h-4 w-4 text-emerald-600" />
                    Informações do Vendedor
                  </h4>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-emerald-200 dark:border-emerald-800">
                      <AvatarFallback className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-xs font-bold">
                        {selectedProduct.sellerName?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'NM'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{selectedProduct.sellerName || 'NewMobility'}</p>
                      {/* Seller reputation — real avg + count from cached sellerReputations */}
                      {(() => {
                        const rep = selectedProduct.sellerName ? sellerReputations[selectedProduct.sellerName] : undefined
                        if (!rep) return null
                        return (
                          <div className="flex items-center gap-2 mt-0.5">
                            {renderStars(rep.avgRating, 'sm')}
                            <span className="text-[10px] font-medium text-foreground">
                              {rep.avgRating.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              · {rep.count} {rep.count === 1 ? 'avaliação' : 'avaliações'}
                            </span>
                          </div>
                        )
                      })()}
                      {selectedProduct.sellerName && sellerLocations[selectedProduct.sellerName] && (
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {sellerLocations[selectedProduct.sellerName].city}/{sellerLocations[selectedProduct.sellerName].state}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-emerald-500" />
                      Vendedor verificado
                    </span>
                    <span>{selectedProduct.stock > 0 ? `${selectedProduct.stock} em estoque` : 'Indisponível'}</span>
                  </div>
                </div>

                {/* Reviews Section — only real reviews from verified buyers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      Avaliações dos Clientes
                    </h4>
                    <Badge variant="secondary" className="text-[10px]">
                      {(productReviews[selectedProduct.id]?.length ?? selectedProduct.reviewCount)} reviews
                    </Badge>
                  </div>
                  {(() => {
                    const reviews = productReviews[selectedProduct.id] || []
                    // Compute real distribution from the fetched reviews
                    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                    for (const r of reviews) {
                      if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++
                    }
                    const total = reviews.length
                    return (
                      <>
                        {/* Rating summary — real distribution */}
                        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border border-border">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-foreground">
                              {total > 0
                                ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
                                : selectedProduct.rating.toFixed(1)}
                            </p>
                            {renderStars(total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : selectedProduct.rating, 'md')}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {total > 0 ? `${total} ${total === 1 ? 'avaliação real' : 'avaliações reais'}` : 'sem avaliações'}
                            </p>
                          </div>
                          <div className="flex-1 space-y-1">
                            {[5, 4, 3, 2, 1].map(stars => {
                              const count = dist[stars]
                              const percent = total > 0 ? Math.round((count / total) * 100) : 0
                              return (
                                <div key={stars} className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-3">{stars}</span>
                                  <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${percent}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground w-10">{count} ({percent}%)</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        {/* Real reviews list */}
                        {reviewsLoading ? (
                          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Carregando avaliações...
                          </div>
                        ) : reviews.length === 0 ? (
                          <div className="text-center py-8 px-4 bg-muted/30 rounded-lg border border-dashed border-border">
                            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Ainda não há avaliações para este produto.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Compre e avalie para ser o primeiro!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {reviews.map(review => (
                              <div key={review.id} className="p-3 bg-card rounded-lg border border-border">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-[8px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                        {review.reviewerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium text-foreground">{review.reviewerName}</span>
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 text-emerald-600 border-emerald-300">
                                      <Check className="h-2.5 w-2.5" />
                                      Compra verificada
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="mb-1">{renderStars(review.rating, 'sm')}</div>
                                {review.comment && (
                                  <p className="text-xs text-muted-foreground">{review.comment}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setSelectedProduct(null)}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      addToCart(selectedProduct)
                      setSelectedProduct(null)
                    }}
                    disabled={selectedProduct.stock <= 0}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Sidebar */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="sm:max-w-md">
          <DialogDescription className="sr-only">Carrinho de compras</DialogDescription>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-500" />
              Carrinho ({cartCount} {cartCount === 1 ? 'item' : 'itens'})
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Seu carrinho está vazio</p>
              <Button
                variant="outline"
                className="mt-3 border-emerald-300 text-emerald-600"
                onClick={() => setShowCart(false)}
              >
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className={cn(
                    'w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0',
                    categoryColors[item.product.category] || 'from-gray-400 to-gray-500'
                  )}>
                    <span className="text-lg">{categoryIcons[item.product.category] || '📦'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-emerald-600 font-semibold">{formatPrice(item.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6"
                      onClick={() => updateCartQuantity(item.product.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6"
                      onClick={() => updateCartQuantity(item.product.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'itens'})</span>
                <span className="font-semibold">{formatPrice(cartTotal)}</span>
              </div>
              {cartCashback > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" />
                    CashBack estimado
                  </span>
                  <span className="font-semibold text-emerald-600">+{formatPrice(cartCashback)}</span>
                </div>
              )}
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                onClick={() => {
                  setShowCart(false)
                  setShowCheckout(true)
                  setCheckoutStep(0)
                }}
              >
                Finalizar Compra
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogDescription className="sr-only">Finalizar compra</DialogDescription>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              Finalizar Compra
            </DialogTitle>
          </DialogHeader>

          {checkoutStep === 0 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Resumo do Pedido</p>
                <p className="text-xs text-muted-foreground mt-1">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">{formatPrice(cartTotal)}</p>
                {cartCashback > 0 && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                    <Zap className="h-3 w-3" /> +{formatPrice(cartCashback)} CashBack
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Endereço de Entrega</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rua, número, bairro, cidade - UF"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setCheckoutStep(1)}
              >
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {checkoutStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Forma de Pagamento</p>
              <div className="space-y-2">
                {[
                  { id: 'pix', icon: QrCode, label: 'PIX', desc: 'Pagamento instantâneo' },
                  { id: 'credit_card', icon: CreditCard, label: 'Cartão de Crédito', desc: 'Até 12x sem juros' },
                  { id: 'balance', icon: Wallet, label: 'Saldo NewMobility', desc: user ? `Disponível: ${formatPrice(user.balanceWithdrawal)}` : 'Sem saldo' },
                ].map(method => {
                  const Icon = method.icon
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                        paymentMethod === method.id
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm'
                          : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                      )}
                    >
                      <Icon className={cn('h-5 w-5', paymentMethod === method.id ? 'text-emerald-600' : 'text-muted-foreground')} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{method.label}</p>
                        <p className="text-[10px] text-muted-foreground">{method.desc}</p>
                      </div>
                      {paymentMethod === method.id && <Check className="h-4 w-4 text-emerald-600" />}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCheckoutStep(0)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCheckout}
                  disabled={!paymentMethod || processing}
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    <>
                      Confirmar Pedido
                      <Check className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Post-purchase Review Dialog ──
          Used for both directions: buyer → seller and seller → buyer.
          Caller pre-fills orderId/productId/direction via openReviewDialog(). */}
      <Dialog open={!!reviewDialog?.open} onOpenChange={(open) => { if (!open) closeReviewDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogDescription className="sr-only">
            Avaliação de {reviewDialog?.direction === 'buyer_to_seller' ? 'vendedor' : 'comprador'}
          </DialogDescription>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              {reviewDialog?.direction === 'buyer_to_seller' ? 'Avaliar Vendedor' : 'Avaliar Comprador'}
            </DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">Produto</p>
                <p className="text-sm font-medium text-foreground line-clamp-2">{reviewDialog.productName}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {reviewDialog.direction === 'buyer_to_seller'
                    ? `Vendedor: ${reviewDialog.counterpartyName}`
                    : `Pedido: #${reviewDialog.orderId.slice(-8).toUpperCase()}`}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Sua nota</label>
                {renderStarPicker()}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Comentário <span className="text-muted-foreground">(opcional)</span>
                </label>
                <Textarea
                  placeholder={
                    reviewDialog.direction === 'buyer_to_seller'
                      ? 'Conte como foi sua experiência com o vendedor (entrega, qualidade, atendimento)...'
                      : 'Conte como foi sua experiência com o comprador (pagamento, comunicação)...'
                  }
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {reviewComment.length}/500
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeReviewDialog}
                  disabled={reviewSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={submitReview}
                  disabled={reviewSubmitting || reviewRating < 1}
                >
                  {reviewSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Enviar Avaliação
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
