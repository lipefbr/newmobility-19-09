'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { marketplaceApi } from '@/lib/api'
import {
  Store, TrendingUp, Users, Package, BarChart3, Settings,
  ShoppingCart, DollarSign, ArrowUpRight, Clock, CheckCircle2,
  Percent, Plus, Eye, Sparkles, Shield, Truck, Headphones, Award, Zap,
  Edit, Trash2, ToggleLeft, ToggleRight, Search, RefreshCw, Loader2,
  Tag, Star, AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  originalPrice: number | null
  category: string
  imageUrl: string | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  cashbackPercent: number
  rating: number
  reviewCount: number
  sellerName: string | null
  tags: string | null
  createdAt: string
}

interface SellerOrder {
  id: string
  status: string
  totalAmount: number
  cashbackEarned: number
  createdAt: string
  items: SellerOrderItem[]
}

interface SellerOrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  cashbackPercent: number
  category: string
  imageUrl: string | null
  sellerName: string | null
}

const categoryOptions = [
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

const categoryLabels: Record<string, string> = {
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

const categoryColors: Record<string, string> = {
  'acessorios-veiculares': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'eletronicos-auto': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'servicos-automotivos': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  'estetica-veicular': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  electronics: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  fashion: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  home: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  health: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  beauty: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  food: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  services: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  mobility: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  digital: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
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

const benefits = [
  { icon: DollarSign, title: 'CashBack Automático', desc: 'Receba CashBack em cada venda realizada' },
  { icon: Users, title: 'Base de Clientes', desc: 'Acesse milhares de membros da rede NewMobility' },
  { icon: Truck, title: 'Logística Integrada', desc: 'Sistema de entrega e rastreamento incluso' },
  { icon: Shield, title: 'Pagamento Seguro', desc: 'Receba com garantia e proteção contra fraudes' },
  { icon: BarChart3, title: 'Relatórios Detalhados', desc: 'Dashboards com métricas em tempo real' },
  { icon: Headphones, title: 'Suporte Dedicado', desc: 'Atendimento prioritário para lojistas' },
]

export function PortalLojista() {
  const { user, setActivePage } = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showEditProduct, setShowEditProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'overview' | 'products' | 'orders'>('overview')

  // Add product form
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formOriginalPrice, setFormOriginalPrice] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formCashbackPercent, setFormCashbackPercent] = useState('')
  const [formIsFeatured, setFormIsFeatured] = useState(false)

  const fetchProducts = useCallback(async () => {
    if (!user?.name) return
    try {
      setLoading(true)
      const data = await marketplaceApi.getProducts({ search: user.name })
      // Filter to only show products by this seller
      const sellerProducts = (data.products || []).filter(
        (p: Product) => p.sellerName === user.name
      )
      setProducts(sellerProducts)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.name])

  const fetchOrders = useCallback(async () => {
    if (!user?.name) return
    try {
      setOrdersLoading(true)
      const data = await marketplaceApi.getOrders(user.id)
      // The orders API now returns user orders - we need seller-specific orders
      const res = await fetch(`/api/marketplace/orders?sellerName=${encodeURIComponent(user.name)}`)
      const ordersData = await res.json()
      setOrders(ordersData.orders || [])
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setOrdersLoading(false)
    }
  }, [user?.name, user?.id])

  useEffect(() => {
    fetchProducts()
    fetchOrders()
  }, [fetchProducts, fetchOrders])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormOriginalPrice('')
    setFormCategory('')
    setFormStock('')
    setFormCashbackPercent('')
    setFormIsFeatured(false)
  }

  const handleAddProduct = async () => {
    if (!user?.id || !formName || !formPrice || !formCategory) {
      toast.error('Preencha nome, preço e categoria')
      return
    }

    setSaving(true)
    try {
      await marketplaceApi.createProduct(user.id, {
        name: formName,
        description: formDescription || null,
        price: Math.round(Number(formPrice) * 100),
        originalPrice: formOriginalPrice ? Math.round(Number(formOriginalPrice) * 100) : null,
        category: formCategory,
        stock: Number(formStock) || 0,
        cashbackPercent: Number(formCashbackPercent) || 0,
        isFeatured: formIsFeatured,
        sellerName: user.name,
      })
      toast.success('Produto criado com sucesso!')
      setShowAddProduct(false)
      resetForm()
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar produto')
    } finally {
      setSaving(false)
    }
  }

  const handleEditProduct = async () => {
    if (!user?.id || !editingProduct || !formName || !formPrice || !formCategory) {
      toast.error('Preencha nome, preço e categoria')
      return
    }

    setSaving(true)
    try {
      await marketplaceApi.updateProduct(user.id, editingProduct.id, {
        name: formName,
        description: formDescription || null,
        price: Math.round(Number(formPrice) * 100),
        originalPrice: formOriginalPrice ? Math.round(Number(formOriginalPrice) * 100) : null,
        category: formCategory,
        stock: Number(formStock) || 0,
        cashbackPercent: Number(formCashbackPercent) || 0,
        isFeatured: formIsFeatured,
      })
      toast.success('Produto atualizado com sucesso!')
      setShowEditProduct(false)
      setEditingProduct(null)
      resetForm()
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar produto')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (product: Product) => {
    if (!user?.id) return
    try {
      await marketplaceApi.updateProduct(user.id, product.id, {
        isActive: !product.isActive,
      })
      toast.success(product.isActive ? 'Produto desativado' : 'Produto ativado')
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status')
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!user?.id) return
    try {
      await marketplaceApi.deleteProduct(user.id, product.id)
      toast.success('Produto removido')
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover produto')
    }
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setFormName(product.name)
    setFormDescription(product.description || '')
    setFormPrice(String(product.price / 100))
    setFormOriginalPrice(product.originalPrice ? String(product.originalPrice / 100) : '')
    setFormCategory(product.category)
    setFormStock(String(product.stock))
    setFormCashbackPercent(String(product.cashbackPercent))
    setFormIsFeatured(product.isFeatured)
    setShowEditProduct(true)
  }

  // Computed stats
  const activeProducts = products.filter(p => p.isActive)
  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0)
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing')
  const completedOrders = orders.filter(o => o.status === 'delivered')

  const filteredProducts = productSearch
    ? products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase())
      )
    : products

  const salesMetrics = [
    { label: 'Vendas Total', value: formatCurrency(totalSales), change: orders.length > 0 ? `+${orders.length}` : '', icon: DollarSign, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Vendas Semana', value: formatCurrency(totalSales), change: '', icon: TrendingUp, color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
    { label: 'Pedidos Pendentes', value: String(pendingOrders.length), change: '', icon: Clock, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Produtos Ativos', value: String(activeProducts.length), change: String(products.length), icon: Package, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  ]

  const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-amber-500', label: 'Pendente' },
    processing: { icon: Loader2, color: 'text-blue-500', label: 'Processando' },
    shipped: { icon: Truck, color: 'text-purple-500', label: 'Enviado' },
    delivered: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Entregue' },
    cancelled: { icon: AlertCircle, color: 'text-red-500', label: 'Cancelado' },
  }

  // Access control: only lojista users can access this portal
  if (user?.userType !== 'lojista') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 max-w-md text-center">
          <Store className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Acesso Restrito</h2>
          <p className="text-sm text-red-600 dark:text-red-300 mt-2">Apenas lojistas podem acessar o Portal do Lojista.</p>
          <Button
            variant="outline"
            className="mt-4 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
            onClick={() => setActivePage('dashboard')}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Portal do Lojista</h2>
          <p className="text-sm text-muted-foreground">Gerencie sua loja e acompanhe suas vendas</p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          onClick={() => { resetForm(); setShowAddProduct(true) }}
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Hero Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 border-0 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9zdmc+\")"
          }} />
          <CardContent className="p-6 text-white relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-white/15">
                <Store className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Olá, {user?.name?.split(' ')[0] || 'Lojista'}!</h3>
                <p className="text-emerald-200">Gerencie seus produtos e vendas</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <Button
                className="bg-white/15 hover:bg-white/25 text-white border-0 gap-1.5"
                onClick={() => { resetForm(); setShowAddProduct(true) }}
              >
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </Button>
              <Button
                className="bg-white/15 hover:bg-white/25 text-white border-0 gap-1.5"
                onClick={() => setActiveSection('products')}
              >
                <Package className="h-4 w-4" />
                Meus Produtos ({products.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Vantagens Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-500" />
              Vantagens para Lojistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {benefits.map((benefit, i) => {
                const BenefitIcon = benefit.icon
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-lg border border-border bg-card hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 w-fit mb-2 group-hover:scale-105 transition-transform">
                      <BenefitIcon className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-foreground">{benefit.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{benefit.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {[
          { id: 'overview' as const, label: 'Visão Geral', icon: BarChart3 },
          { id: 'products' as const, label: `Meus Produtos (${products.length})`, icon: Package },
          { id: 'orders' as const, label: `Vendas (${orders.length})`, icon: ShoppingCart },
        ].map(tab => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeSection === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveSection(tab.id)}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <>
          {/* Sales Dashboard */}
          <div>
            <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Dashboard de Vendas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {salesMetrics.map((metric, i) => (
                <motion.div key={metric.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="shadow-sm bg-card hover:shadow-md hover:scale-[1.02] transition-all duration-200 group card-hover-lift">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${metric.color} group-hover:scale-105 transition-transform`}>
                          <metric.icon className="h-3.5 w-3.5" />
                        </div>
                        {metric.change && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:border-emerald-800">
                            {metric.change}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xl font-bold text-foreground">{metric.value}</p>
                      <p className="text-[10px] text-muted-foreground">{metric.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CashBack Configuration */}
          <Card className="shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-600" />
                Configuração de CashBack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center border border-emerald-100 dark:border-emerald-900/50">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {activeProducts.length > 0 ? (activeProducts.reduce((sum, p) => sum + p.cashbackPercent, 0) / activeProducts.length).toFixed(1) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">CashBack Médio</p>
                  <Progress value={activeProducts.length > 0 ? (activeProducts.reduce((sum, p) => sum + p.cashbackPercent, 0) / activeProducts.length) * 10 : 0} className="h-1.5 mt-2" />
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/30 rounded-lg p-4 text-center border border-rose-100 dark:border-rose-900/50">
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                    {activeProducts.filter(p => p.cashbackPercent >= 10).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Produtos +10% CB</p>
                  <Progress value={activeProducts.length > 0 ? (activeProducts.filter(p => p.cashbackPercent >= 10).length / activeProducts.length) * 100 : 0} className="h-1.5 mt-2" />
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center border border-amber-100 dark:border-amber-900/50">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {activeProducts.filter(p => p.isFeatured).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Destaques</p>
                  <Progress value={activeProducts.length > 0 ? (activeProducts.filter(p => p.isFeatured).length / activeProducts.length) * 100 : 0} className="h-1.5 mt-2" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">Configure as porcentagens de CashBack oferecidas aos clientes em cada produto.</p>
            </CardContent>
          </Card>

          {/* Quick Product Preview */}
          <Card className="shadow-sm bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  Produtos Recentes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-emerald-600"
                  onClick={() => setActiveSection('products')}
                >
                  Ver todos <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-64 overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Carregando produtos...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum produto cadastrado</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-emerald-300 text-emerald-600"
                      onClick={() => { resetForm(); setShowAddProduct(true) }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Criar Primeiro Produto
                    </Button>
                  </div>
                ) : (
                  products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className={cn('p-2 rounded-lg', categoryColors[product.category] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400')}>
                        <span className="text-base">{categoryIcons[product.category] || '📦'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{categoryLabels[product.category] || product.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">Estoque: {product.stock}</span>
                          {product.cashbackPercent > 0 && (
                            <span className="text-[10px] text-emerald-600 font-medium">{product.cashbackPercent}% CB</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(product.price)}</p>
                        <Badge className={product.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px]'
                        }>
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders Preview */}
          <Card className="shadow-sm bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  Vendas Recentes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-emerald-600"
                  onClick={() => setActiveSection('orders')}
                >
                  Ver todas <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-64 overflow-y-auto custom-scrollbar">
                {ordersLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Carregando vendas...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma venda realizada ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Adicione produtos ao marketplace para começar a vender!</p>
                  </div>
                ) : (
                  orders.slice(0, 5).map((order) => {
                    const config = statusConfig[order.status] || statusConfig.pending
                    const StatusIcon = config.icon
                    return (
                      <div key={order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                        <StatusIcon className={cn('h-4 w-4 shrink-0', config.color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">Pedido #{order.id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} · {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(order.totalAmount)}</p>
                          <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Settings, title: 'Configurações', desc: 'Configure sua loja e preferências', soon: true },
              { icon: BarChart3, title: 'Relatórios', desc: 'Análise detalhada de desempenho', soon: true },
              { icon: Store, title: 'Perfil da Loja', desc: 'Edite informações da loja', soon: false },
            ].map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                <Card className="shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer group bg-card relative">
                  {item.soon && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-amber-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 border-0 shadow-sm">
                        Em Breve
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-foreground text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Products Section */}
      {activeSection === 'products' && (
        <div className="space-y-4">
          {/* Product search & filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos por nome ou categoria..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={() => { resetForm(); setShowAddProduct(true) }}
            >
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchProducts}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Products Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-lg font-bold text-foreground">{activeProducts.length}</p>
              <p className="text-[10px] text-muted-foreground">Ativos</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 text-center border border-gray-100 dark:border-gray-800/50">
              <p className="text-lg font-bold text-foreground">{products.length - activeProducts.length}</p>
              <p className="text-[10px] text-muted-foreground">Inativos</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center border border-amber-100 dark:border-amber-900/50">
              <p className="text-lg font-bold text-foreground">{products.filter(p => p.isFeatured).length}</p>
              <p className="text-[10px] text-muted-foreground">Destaques</p>
            </div>
          </div>

          {/* Products List */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Carregando produtos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
              <Button
                variant="outline"
                className="mt-4 border-emerald-300 text-emerald-600"
                onClick={() => { resetForm(); setShowAddProduct(true) }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Produto
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                  >
                    <Card className={cn(
                      'overflow-hidden border hover:shadow-md transition-all',
                      !product.isActive && 'opacity-60'
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Product icon */}
                          <div className={cn(
                            'h-14 w-14 rounded-xl flex items-center justify-center text-2xl shrink-0',
                            categoryColors[product.category] || 'bg-gray-100 dark:bg-gray-800'
                          )}>
                            {categoryIcons[product.category] || '📦'}
                          </div>

                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-foreground truncate">{product.name}</h3>
                                  {product.isFeatured && (
                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] border-0">
                                      <Star className="h-2.5 w-2.5 mr-0.5" /> Destaque
                                    </Badge>
                                  )}
                                </div>
                                {product.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">
                                {categoryLabels[product.category] || product.category}
                              </Badge>
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(product.price)}
                              </span>
                              {product.originalPrice && product.originalPrice > product.price && (
                                <span className="text-[10px] text-muted-foreground line-through">
                                  {formatCurrency(product.originalPrice)}
                                </span>
                              )}
                              {product.cashbackPercent > 0 && (
                                <Badge className="bg-emerald-600 text-white text-[9px] border-0">
                                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                                  {product.cashbackPercent}% CB
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                Estoque: {product.stock}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ⭐ {product.rating.toFixed(1)} ({product.reviewCount})
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleActive(product)}
                              title={product.isActive ? 'Desativar' : 'Ativar'}
                            >
                              {product.isActive ? (
                                <ToggleRight className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditProduct(product)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteProduct(product)}
                              title="Remover"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Orders Section */}
      {activeSection === 'orders' && (
        <div className="space-y-4">
          {/* Orders Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50">
              <ShoppingCart className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{orders.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Vendas</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center border border-amber-100 dark:border-amber-900/50">
              <Clock className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{pendingOrders.length}</p>
              <p className="text-[10px] text-muted-foreground">Pendentes</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center border border-purple-100 dark:border-purple-900/50">
              <Truck className="h-4 w-4 text-purple-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{orders.filter(o => o.status === 'shipped').length}</p>
              <p className="text-[10px] text-muted-foreground">Enviados</p>
            </div>
            <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 text-center border border-teal-100 dark:border-teal-900/50">
              <CheckCircle2 className="h-4 w-4 text-teal-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-foreground">{completedOrders.length}</p>
              <p className="text-[10px] text-muted-foreground">Entregues</p>
            </div>
          </div>

          {/* Orders List */}
          {ordersLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Carregando vendas...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma venda realizada ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione produtos ao marketplace para começar a vender!</p>
              <Button
                variant="outline"
                className="mt-4 border-emerald-300 text-emerald-600"
                onClick={() => setActiveSection('products')}
              >
                Ver Meus Produtos
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, i) => {
                const config = statusConfig[order.status] || statusConfig.pending
                const StatusIcon = config.icon
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="overflow-hidden border hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
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
                                config.color
                              )} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Pedido #{order.id.slice(-8).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-600">{formatCurrency(order.totalAmount)}</p>
                              {order.cashbackEarned > 0 && (
                                <p className="text-[10px] text-emerald-500 flex items-center gap-0.5 justify-end">
                                  <Zap className="h-2.5 w-2.5" /> +{formatCurrency(order.cashbackEarned)} CB
                                </p>
                              )}
                            </div>
                            <Badge className={cn('text-[10px]', config.color === 'text-emerald-500' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : config.color === 'text-amber-500' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : config.color === 'text-blue-500' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : config.color === 'text-purple-500' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400')}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2 pt-2 border-t">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{categoryIcons[item.category] || '📦'}</span>
                                <div>
                                  <span className="text-xs text-foreground">{item.productName}</span>
                                  <span className="text-[10px] text-muted-foreground ml-2">x{item.quantity}</span>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Novo Produto
            </DialogTitle>
            <DialogDescription>
              Adicione um novo produto ao marketplace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                placeholder="Ex: Fone Bluetooth Premium"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o produto detalhadamente..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="89.90"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Preço Original (R$)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  placeholder="129.90"
                  value={formOriginalPrice}
                  onChange={(e) => setFormOriginalPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {categoryIcons[cat.value]} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="100"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cashback">CashBack (%)</Label>
                <Input
                  id="cashback"
                  type="number"
                  step="0.5"
                  placeholder="5"
                  value={formCashbackPercent}
                  onChange={(e) => setFormCashbackPercent(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="featured"
                checked={formIsFeatured}
                onCheckedChange={setFormIsFeatured}
              />
              <Label htmlFor="featured" className="cursor-pointer">Produto em destaque</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAddProduct}
              disabled={saving || !formName || !formPrice || !formCategory}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar Produto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditProduct} onOpenChange={(open) => {
        setShowEditProduct(open)
        if (!open) setEditingProduct(null)
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-emerald-600" />
              Editar Produto
            </DialogTitle>
            <DialogDescription>
              Atualize as informações do produto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Produto *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Preço (R$) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-originalPrice">Preço Original (R$)</Label>
                <Input
                  id="edit-originalPrice"
                  type="number"
                  step="0.01"
                  value={formOriginalPrice}
                  onChange={(e) => setFormOriginalPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Categoria *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {categoryIcons[cat.value]} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Estoque</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cashback">CashBack (%)</Label>
                <Input
                  id="edit-cashback"
                  type="number"
                  step="0.5"
                  value={formCashbackPercent}
                  onChange={(e) => setFormCashbackPercent(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="edit-featured"
                checked={formIsFeatured}
                onCheckedChange={setFormIsFeatured}
              />
              <Label htmlFor="edit-featured" className="cursor-pointer">Produto em destaque</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleEditProduct}
              disabled={saving || !formName || !formPrice || !formCategory}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
