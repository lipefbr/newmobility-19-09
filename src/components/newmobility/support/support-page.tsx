'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { formatDate, getStatusLabel, getStatusVariant, formatDateTime } from '@/lib/utils'
import {
  Headphones, Plus, MessageCircle, Clock, CheckCircle2, AlertCircle,
  Send, Filter, Mail, Phone, MessageSquare, HelpCircle, Zap, CreditCard,
  Smartphone, ShoppingBag, ChevronRight, Sparkles, Search, Star, ThumbsUp,
  ChevronDown, Smile, Meh, Frown, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { EmptyState } from '../ui/empty-states'
import { useStore } from '@/lib/store'
import { supportApi, ApiError } from '@/lib/api'

const categoryLabels: Record<string, string> = {
  support: 'Suporte',
  financial: 'Financeiro',
  technical: 'Técnico',
  mobility: 'Mobilidade',
  shopping: 'Compras',
  food: 'Refeição',
  pharmacy: 'Farmácia',
}

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  normal: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

const priorityDots: Record<string, { dot: string; bg: string; text: string }> = {
  low: { dot: 'bg-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400' },
  normal: { dot: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' },
  high: { dot: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' },
  urgent: { dot: 'bg-red-600 animate-pulse', bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' },
}

const satisfactionEmojis: Record<string, { emoji: string; label: string; color: string }> = {
  happy: { emoji: '😊', label: 'Satisfeito', color: 'text-emerald-500' },
  neutral: { emoji: '😐', label: 'Neutro', color: 'text-amber-500' },
  unhappy: { emoji: '😞', label: 'Insatisfeito', color: 'text-red-500' },
}

const statusIcons: Record<string, React.ElementType> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: CheckCircle2,
}

// Status badge config
const statusBadgeConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open: { label: 'Aberto', bg: 'bg-emerald-100 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  in_progress: { label: 'Em Andamento', bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  resolved: { label: 'Resolvido', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  closed: { label: 'Fechado', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
}

// Hardcoded fallback FAQ categories shown as filter chips. These map the most
// common categories used by admins; categories actually returned by the API
// are added dynamically so admin-defined categories appear even if not listed
// here.
const faqCategories = [
  { key: 'all', label: 'Todas' },
  { key: 'cashback', label: 'CashBack' },
  { key: 'financial', label: 'Financeiro' },
  { key: 'plans', label: 'Planos' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'career', label: 'Carreira' },
]

const quickActions = [
  { icon: CreditCard, label: 'Problema com Saque', category: 'financial', desc: 'Saque não processado' },
  { icon: Smartphone, label: 'Problema no App', category: 'technical', desc: 'Erro ou falha no app' },
  { icon: ShoppingBag, label: 'Voucher não funciona', category: 'shopping', desc: 'Código inválido' },
  { icon: Zap, label: 'CashBack não creditado', category: 'financial', desc: 'Valor pendente' },
]

// Satisfaction rating component
function SatisfactionRating({ ticketId }: { ticketId: string }) {
  const [rating, setRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmitRating = (stars: number) => {
    setRating(stars)
    setSubmitted(true)
    toast({ title: 'Obrigado!', description: `Você avaliou com ${stars} estrela${stars > 1 ? 's' : ''}.` })
  }

  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
      <p className="text-xs text-muted-foreground mb-2">Como foi sua experiência?</p>
      {submitted ? (
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
            ))}
          </div>
          <span className="text-xs text-emerald-600 font-medium">Obrigado!</span>
        </div>
      ) : (
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleSubmitRating(i + 1)}
              className="p-0.5 hover:scale-125 transition-transform"
            >
              <Star className={`h-5 w-5 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'} transition-colors`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type FaqItem = {
  id: string
  question: string
  answer: string
  category: string
}

type TicketMessage = {
  id: string
  message: string
  isAdmin: boolean
  createdAt: string
  date?: string
}

type Ticket = {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  responseTime?: string
  satisfaction?: string | null
  messages: TicketMessage[]
  createdAt: string
  updatedAt: string
}

export function SupportPage() {
  const { toast } = useToast()
  const { user } = useStore()
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [newTicketOpen, setNewTicketOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [faqCategory, setFaqCategory] = useState('all')
  const [faqSearch, setFaqSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'normal',
    message: '',
  })

  // Real data state — replaces the old mockTickets / faqItems constants.
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState<string | null>(null)

  const [faqItems, setFaqItems] = useState<FaqItem[]>([])
  const [faqLoading, setFaqLoading] = useState(true)
  const [faqError, setFaqError] = useState<string | null>(null)

  // Detailed conversation for the selected ticket (fetched separately so the
  // user sees the full back-and-forth, not just the latest message).
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [activeTicketLoading, setActiveTicketLoading] = useState(false)

  const [submittingTicket, setSubmittingTicket] = useState(false)
  const [replying, setReplying] = useState(false)

  // Fetch the user's ticket list (each row only includes the latest message).
  const refreshTickets = useCallback(async () => {
    if (!user?.id) {
      setTickets([])
      setTicketsLoading(false)
      return
    }
    setTicketsLoading(true)
    setTicketsError(null)
    try {
      const data = await supportApi.getTickets(user.id)
      // Normalize the API response: each ticket may include `messages` (latest
      // only) — we keep it so the list view can show a preview, but the full
      // conversation is fetched on selection.
      const list: Ticket[] = (data?.tickets ?? []).map((t: any) => ({
        id: t.id,
        subject: t.subject ?? '',
        category: t.category ?? 'support',
        status: t.status ?? 'open',
        priority: t.priority ?? 'normal',
        responseTime: t.responseTime,
        satisfaction: t.satisfaction ?? null,
        messages: (t.messages ?? []).map((m: any) => ({
          id: m.id,
          message: m.message ?? '',
          isAdmin: !!m.isAdmin,
          createdAt: m.createdAt ?? m.date ?? new Date().toISOString(),
          date: m.date,
        })),
        createdAt: t.createdAt ?? new Date().toISOString(),
        updatedAt: t.updatedAt ?? t.createdAt ?? new Date().toISOString(),
      }))
      setTickets(list)
    } catch (err) {
      console.error('Failed to load tickets:', err)
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Não foi possível carregar seus tickets.'
      setTicketsError(msg)
      setTickets([])
    } finally {
      setTicketsLoading(false)
    }
  }, [user?.id])

  // Fetch public FAQs.
  const refreshFaqs = useCallback(async () => {
    setFaqLoading(true)
    setFaqError(null)
    try {
      const res = await fetch('/api/faq', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list: FaqItem[] = (data?.faqs ?? []).map((f: any) => ({
        id: f.id,
        question: f.question ?? '',
        answer: f.answer ?? '',
        category: f.category ?? 'geral',
      }))
      setFaqItems(list)
    } catch (err) {
      console.error('Failed to load FAQs:', err)
      setFaqError('Não foi possível carregar as perguntas frequentes.')
      setFaqItems([])
    } finally {
      setFaqLoading(false)
    }
  }, [])

  // Initial load — fetch both tickets and FAQs in parallel.
  useEffect(() => {
    refreshFaqs()
    refreshTickets()
  }, [refreshFaqs, refreshTickets])

  // When a ticket is selected, fetch its full conversation (all messages,
  // ascending order) so the user sees admin replies as they come in.
  useEffect(() => {
    if (!selectedTicket || !user?.id) {
      setActiveTicket(null)
      return
    }
    let cancelled = false
    setActiveTicketLoading(true)
    supportApi
      .getTicket(selectedTicket, user.id)
      .then((data: any) => {
        if (cancelled) return
        const t = data?.ticket
        if (!t) {
          setActiveTicket(null)
          return
        }
        const detail: Ticket = {
          id: t.id,
          subject: t.subject ?? '',
          category: t.category ?? 'support',
          status: t.status ?? 'open',
          priority: t.priority ?? 'normal',
          responseTime: t.responseTime,
          satisfaction: t.satisfaction ?? null,
          messages: (t.messages ?? []).map((m: any) => ({
            id: m.id,
            message: m.message ?? '',
            isAdmin: !!m.isAdmin,
            createdAt: m.createdAt ?? m.date ?? new Date().toISOString(),
            date: m.date,
          })),
          createdAt: t.createdAt ?? new Date().toISOString(),
          updatedAt: t.updatedAt ?? t.createdAt ?? new Date().toISOString(),
        }
        setActiveTicket(detail)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load ticket detail:', err)
        toast({
          title: 'Erro ao carregar ticket',
          description:
            err instanceof ApiError
              ? err.message
              : 'Tente novamente em alguns instantes.',
          variant: 'destructive',
        })
        setActiveTicket(null)
      })
      .finally(() => {
        if (!cancelled) setActiveTicketLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedTicket, user?.id, toast])

  const filtered = tickets.filter((t) => {
    if (categoryFilter === 'all') return true
    return t.category === categoryFilter
  })

  const filteredFaq = faqItems.filter((item) => {
    const matchesCategory = faqCategory === 'all' || item.category === faqCategory
    const matchesSearch = faqSearch === '' || item.question.toLowerCase().includes(faqSearch.toLowerCase()) || item.answer.toLowerCase().includes(faqSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleQuickAction = (category: string) => {
    setNewTicket((prev) => ({ ...prev, category }))
    setNewTicketOpen(true)
  }

  const handleSubmitTicket = async () => {
    if (!newTicket.subject || !newTicket.category || !newTicket.message) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' })
      return
    }
    if (!user?.id) {
      toast({ title: 'Faça login para criar um ticket', variant: 'destructive' })
      return
    }
    setSubmittingTicket(true)
    try {
      await supportApi.createTicket(
        user.id,
        newTicket.subject,
        newTicket.category,
        newTicket.message
      )
      setNewTicketOpen(false)
      setNewTicket({ subject: '', category: '', priority: 'normal', message: '' })
      toast({
        title: 'Ticket criado com sucesso!',
        description: 'Nossa equipe responderá em breve.',
      })
      // Refresh the list so the new ticket appears immediately.
      await refreshTickets()
    } catch (err) {
      console.error('Create ticket error:', err)
      toast({
        title: 'Erro ao criar ticket',
        description:
          err instanceof ApiError
            ? err.message
            : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingTicket(false)
    }
  }

  const handleReply = async () => {
    if (!selectedTicket || !user?.id) return
    if (!newMessage.trim()) {
      toast({ title: 'Digite uma mensagem', variant: 'destructive' })
      return
    }
    setReplying(true)
    try {
      await supportApi.replyTicket(selectedTicket, user.id, newMessage.trim())
      setNewMessage('')
      // Refresh the full conversation so the user's message appears, then also
      // refresh the ticket list so the updatedAt timestamp stays in sync.
      const data = await supportApi.getTicket(selectedTicket, user.id)
      const t = data?.ticket
      if (t) {
        const detail: Ticket = {
          id: t.id,
          subject: t.subject ?? '',
          category: t.category ?? 'support',
          status: t.status ?? 'open',
          priority: t.priority ?? 'normal',
          responseTime: t.responseTime,
          satisfaction: t.satisfaction ?? null,
          messages: (t.messages ?? []).map((m: any) => ({
            id: m.id,
            message: m.message ?? '',
            isAdmin: !!m.isAdmin,
            createdAt: m.createdAt ?? m.date ?? new Date().toISOString(),
            date: m.date,
          })),
          createdAt: t.createdAt ?? new Date().toISOString(),
          updatedAt: t.updatedAt ?? t.createdAt ?? new Date().toISOString(),
        }
        setActiveTicket(detail)
      }
      await refreshTickets()
      toast({ title: 'Mensagem enviada!' })
    } catch (err) {
      console.error('Reply error:', err)
      toast({
        title: 'Erro ao enviar mensagem',
        description:
          err instanceof ApiError
            ? err.message
            : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setReplying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Suporte</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus tickets de suporte</p>
        </div>
        <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="h-4 w-4" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-emerald-600" />
                Criar Novo Ticket
              </DialogTitle>
              <DialogDescription className="sr-only">Dialog to create a new support ticket</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input
                  placeholder="Descreva resumidamente seu problema"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket((prev) => ({ ...prev, subject: e.target.value }))}
                  className={!newTicket.subject && newTicket.category ? 'border-red-300 dark:border-red-700' : ''}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={newTicket.category} onValueChange={(v) => setNewTicket((prev) => ({ ...prev, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Suporte</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="technical">Técnico</SelectItem>
                      <SelectItem value="mobility">Mobilidade</SelectItem>
                      <SelectItem value="shopping">Compras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={newTicket.priority} onValueChange={(v) => setNewTicket((prev) => ({ ...prev, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Descreva seu problema em detalhes..."
                  rows={4}
                  value={newTicket.message}
                  onChange={(e) => setNewTicket((prev) => ({ ...prev, message: e.target.value }))}
                  className={!newTicket.message && newTicket.subject ? 'border-red-300 dark:border-red-700' : ''}
                />
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSubmitTicket}
                disabled={submittingTicket}
              >
                {submittingTicket ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Ticket'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleQuickAction(action.category)}
            className="bg-card border border-border rounded-xl p-3 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors text-left group"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <action.icon className="h-4 w-4" />
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-emerald-600 ml-auto" />
            </div>
            <p className="text-xs font-medium text-foreground">{action.label}</p>
            <p className="text-[10px] text-muted-foreground">{action.desc}</p>
          </motion.button>
        ))}
      </div>

      {/* Métodos de Contato */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Headphones className="h-4 w-4 text-emerald-600" />
          Métodos de Contato
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: MessageSquare, title: 'Chat Online', desc: 'Atendimento em tempo real', detail: 'Disponível 9h-18h', responseTime: '< 2 min', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', gradient: 'from-emerald-500 to-emerald-600', hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700' },
            { icon: Mail, title: 'E-mail', desc: 'suporte@newmobility.com.br', detail: 'Resposta em até 24h', responseTime: '~4h', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', gradient: 'from-blue-500 to-blue-600', hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700' },
            { icon: Phone, title: 'Telefone', desc: '0800 123 4567', detail: 'Seg-Sex 8h-20h', responseTime: '< 5 min', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', gradient: 'from-amber-500 to-amber-600', hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700' },
          ].map((contact, i) => (
            <motion.div key={contact.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} whileHover={{ y: -2 }}>
              <Card className={`shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden bg-card card-hover-lift border border-border ${contact.hoverBorder}`}>
                <div className={`h-1.5 bg-gradient-to-r ${contact.gradient}`} />
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${contact.color} group-hover:scale-110 group-hover:rotate-3 transition-all duration-200`}>
                    <contact.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{contact.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{contact.desc}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">{contact.detail}</p>
                    {/* Response time indicator */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Tempo médio: <span className="font-semibold text-foreground">{contact.responseTime}</span></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ with Category Tabs and Quick Help Search */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-emerald-600" />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Quick Help Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na central de ajuda..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {faqCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFaqCategory(cat.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  faqCategory === cat.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {faqLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando perguntas frequentes...
            </div>
          ) : faqError ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <p className="text-red-600 dark:text-red-400">{faqError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => refreshFaqs()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full accordion-smooth">
              {filteredFaq.map((item, i) => (
                <AccordionItem key={item.id || i} value={`faq-${i}`} className="border-border group/item">
                  <AccordionTrigger className="text-sm text-left hover:text-emerald-700 dark:hover:text-emerald-400 hover:no-underline py-3 [&[data-state=open]>svg]:rotate-180 [&>svg]:transition-transform duration-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {item.question}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 overflow-hidden">
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="pl-5.5 border-l-2 border-emerald-200 dark:border-emerald-800 ml-1.5"
                    >
                      {item.answer}
                    </motion.div>
                  </AccordionContent>
                </AccordionItem>
              ))}
              {filteredFaq.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Nenhuma pergunta encontrada. Tente outro termo.
                </div>
              )}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Active Tickets - Chat-style */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Ticket List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">Seus Tickets</h3>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs w-36">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                <SelectItem value="support">Suporte</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="technical">Técnico</SelectItem>
                <SelectItem value="shopping">Compras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="shadow-sm bg-card">
            <CardContent className="p-0">
              <div className="divide-y max-h-[500px] overflow-y-auto custom-scrollbar">
                {ticketsLoading ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando tickets...
                  </div>
                ) : ticketsError ? (
                  <div className="flex flex-col items-center justify-center py-10 text-sm text-center gap-2">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    <p className="text-red-600 dark:text-red-400">{ticketsError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => refreshTickets()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="Nenhum ticket aberto"
                    description="Precisa de ajuda? Crie um novo ticket e nossa equipe irá atendê-lo!"
                    actionLabel="Criar ticket"
                    onAction={() => setNewTicketOpen(true)}
                  />
                ) : (
                filtered.map((ticket, i) => {
                  const StatusIcon = statusIcons[ticket.status] || Clock
                  const statusConfig = statusBadgeConfig[ticket.status] || statusBadgeConfig.open
                  const priorityConfig = priorityDots[ticket.priority] || priorityDots.normal
                  const satisfactionInfo = ticket.satisfaction ? satisfactionEmojis[ticket.satisfaction] : null
                  return (
                    <motion.button
                      key={ticket.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedTicket(ticket.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                        selectedTicket === ticket.id ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Priority color dot */}
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${priorityConfig.dot} ${ticket.priority === 'urgent' ? 'animate-pulse' : ''}`} title={`Prioridade: ${priorityLabels[ticket.priority] || ticket.priority}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
                            {/* Satisfaction emoji for closed/resolved tickets */}
                            {satisfactionInfo && (
                              <span className="text-sm shrink-0" title={satisfactionInfo.label}>{satisfactionInfo.emoji}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">
                              {categoryLabels[ticket.category] || ticket.category}
                            </Badge>
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                            {/* Priority color coded badge */}
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityConfig.bg} ${priorityConfig.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
                              {priorityLabels[ticket.priority] || ticket.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-muted-foreground">
                              {ticket.updatedAt ? formatDateTime(ticket.updatedAt) : formatDate(ticket.createdAt)}
                            </p>
                            {/* Response time indicator */}
                            {ticket.responseTime && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                Resposta média: <span className="font-semibold text-foreground">{ticket.responseTime}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  )
                })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-3">
          {selectedTicket && activeTicketLoading ? (
            <Card className="shadow-sm bg-card">
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  Carregando conversa...
                </div>
              </CardContent>
            </Card>
          ) : activeTicket ? (
            <Card className="shadow-sm bg-card">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-foreground">{activeTicket.subject}</CardTitle>
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${(statusBadgeConfig[activeTicket.status] || statusBadgeConfig.open).bg} ${(statusBadgeConfig[activeTicket.status] || statusBadgeConfig.open).text}`}>
                    <span className={`w-2 h-2 rounded-full ${(statusBadgeConfig[activeTicket.status] || statusBadgeConfig.open).dot} ${activeTicket.status === 'open' ? 'animate-pulse' : ''}`} />
                    {(statusBadgeConfig[activeTicket.status] || statusBadgeConfig.open).label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {categoryLabels[activeTicket.category] || activeTicket.category}
                  </Badge>
                  {/* Priority color coding */}
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    activeTicket.priority === 'high' || activeTicket.priority === 'urgent'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : activeTicket.priority === 'low'
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    <AlertCircle className="h-3 w-3" />
                    {priorityLabels[activeTicket.priority] || activeTicket.priority}
                  </span>
                  <span>·</span>
                  <span>{formatDate(activeTicket.createdAt)}</span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar mb-4">
                  <AnimatePresence>
                    {activeTicket.messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.isAdmin
                              ? 'bg-muted text-foreground rounded-bl-sm'
                              : 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-br-sm'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-[10px] mt-1.5 ${
                            msg.isAdmin ? 'text-muted-foreground' : 'text-emerald-200'
                          }`}>
                            {msg.isAdmin ? '🛡️ Atendimento' : '👤 Você'} · {formatDateTime(msg.date || msg.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      disabled={replying}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !replying) handleReply()
                      }}
                    />
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="icon"
                      onClick={handleReply}
                      disabled={replying || !newMessage.trim()}
                    >
                      {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                {/* Satisfaction Rating for resolved/closed tickets */}
                {(activeTicket.status === 'resolved' || activeTicket.status === 'closed') && (
                  <div className="mt-3">
                    {/* Show existing satisfaction if present */}
                    {activeTicket.satisfaction && satisfactionEmojis[activeTicket.satisfaction] && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-2">
                        <span className="text-lg">{satisfactionEmojis[activeTicket.satisfaction].emoji}</span>
                        <span className={`text-xs font-medium ${satisfactionEmojis[activeTicket.satisfaction].color}`}>
                          {satisfactionEmojis[activeTicket.satisfaction].label}
                        </span>
                      </div>
                    )}
                    <SatisfactionRating ticketId={activeTicket.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm bg-card">
              <CardContent className="p-12 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <Headphones className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground font-medium">Selecione um ticket para ver os detalhes</p>
                  <p className="text-xs text-muted-foreground mt-1">ou crie um novo ticket para obter ajuda</p>
                </motion.div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
