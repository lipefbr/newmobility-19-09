'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Smartphone, Apple, Download, QrCode, MapPin, Navigation,
  Shield, CreditCard, Star, Bell, Clock, Car, User,
  CheckCircle2, Zap, RefreshCw, Store, LayoutDashboard, ArrowRight, Globe
} from 'lucide-react'
import { motion } from 'framer-motion'

const driverFeatures = [
  { icon: MapPin, label: 'GPS Integrado', desc: 'Navegação em tempo real' },
  { icon: Bell, label: 'Notificações', desc: 'Alertas de novas corridas' },
  { icon: CreditCard, label: 'Recebimentos', desc: 'Acompanhe seus ganhos' },
  { icon: Shield, label: 'Segurança', desc: 'Botão de emergência' },
  { icon: Star, label: 'Avaliações', desc: 'Veja suas notas' },
  { icon: Clock, label: 'Histórico', desc: 'Todas as suas corridas' },
]

const passengerFeatures = [
  { icon: Navigation, label: 'Rastreamento', desc: 'Acompanhe o motorista' },
  { icon: CreditCard, label: 'Pagamento Fácil', desc: 'Cartão, PIX ou CashBack' },
  { icon: Shield, label: 'Viagem Segura', desc: 'Compartilhe sua rota' },
  { icon: Star, label: 'Avaliação', desc: 'Avalie sua experiência' },
  { icon: Bell, label: 'Alertas', desc: 'Previsão de chegada' },
  { icon: Clock, label: 'Agendamento', desc: 'Agende corridas' },
]

const whatsNew = [
  { version: '3.2.0', date: 'Fev 2025', items: ['Modo escuro', 'Chat com motorista', 'PIX instantâneo'] },
  { version: '3.1.5', date: 'Jan 2025', items: ['Correção de bugs', 'Performance aprimorada', 'Novos mapas'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Web Apps — links to the actual Next.js routes for each app in the ecosystem.
// These are the primary entry points for end users, drivers, merchants and
// the general admin. Clicking a card navigates to the corresponding route,
// which has its own login screen and access control.
// ─────────────────────────────────────────────────────────────────────────────
const WEB_APPS = [
  {
    href: '/mobile/login',
    title: 'App Cliente',
    subtitle: 'Passageiro / Usuário',
    desc: 'Solicite corridas, peça comida, faça compras e gerencie seu CashBack pelo app mobile.',
    icon: User,
    gradient: 'from-sky-500 to-blue-600',
    accent: 'bg-sky-100 text-sky-600',
    border: 'border-sky-200 hover:border-sky-400',
    badge: 'v3.2.0',
  },
  {
    href: '/motorista/login',
    title: 'App Motorista',
    subtitle: 'Condutor parceiro',
    desc: 'Receba corridas em tempo real, acompanhe ganhos e metas diárias.',
    icon: Car,
    gradient: 'from-emerald-500 to-emerald-600',
    accent: 'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-400',
    badge: 'v3.2.0',
  },
  {
    href: '/lojista/login',
    title: 'Painel do Lojista',
    subtitle: 'Comerciante parceiro',
    desc: 'Gerencie sua loja, produtos, pedidos e financeiro em um só lugar.',
    icon: Store,
    gradient: 'from-amber-500 to-orange-600',
    accent: 'bg-amber-100 text-amber-600',
    border: 'border-amber-200 hover:border-amber-400',
    badge: 'v1.0.0',
  },
  {
    href: '/admingeral/login',
    title: 'Admin Geral',
    subtitle: 'Gestão do ecossistema',
    desc: 'Configure categorias, lojas, banners, usuários e todo o app.',
    icon: LayoutDashboard,
    gradient: 'from-slate-700 to-slate-900',
    accent: 'bg-slate-100 text-slate-700',
    border: 'border-slate-200 hover:border-slate-400',
    badge: 'Admin',
  },
]

export function AppsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Acesso aos Apps</h2>
        <p className="text-sm text-gray-500">
          Acesse os painéis web dos apps NewMobility ou faça download dos aplicativos nativos
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          WEB APPS — versões web acessíveis pelo navegador
          (links reais para /mobile, /motorista, /lojista, /admingeral)
      ──────────────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Versões Web (acesso pelo navegador)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WEB_APPS.map((app, i) => (
            <motion.div
              key={app.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={app.href} className="block group">
                <Card
                  className={`shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${app.border} border-2`}
                >
                  <div className={`bg-gradient-to-r ${app.gradient} h-1.5`} />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${app.accent} shrink-0`}>
                        <app.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-bold text-gray-900 text-base">{app.title}</h4>
                          <Badge variant="outline" className="text-[10px]">
                            {app.badge}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{app.subtitle}</p>
                        <p className="text-sm text-gray-600 leading-snug">{app.desc}</p>
                        <div className="flex items-center gap-1 mt-3 text-blue-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          Acessar painel
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Apps Nativos (download)
          </h3>
        </div>
      </div>

      {/* Motorista App — Native download */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <Car className="h-5 w-5" />
                </div>
                App Motorista
                <Badge variant="outline" className="text-[10px] ml-1">v3.2.0</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Aplicativo exclusivo para motoristas parceiros. Receba corridas, acompanhe seus ganhos e gerencie sua conta.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {driverFeatures.map((feature, i) => (
                <div key={i} className="bg-emerald-50 rounded-lg p-3 text-center">
                  <feature.icon className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-900">{feature.label}</p>
                  <p className="text-[10px] text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Download Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-emerald-200 hover:bg-emerald-50">
                <Smartphone className="h-6 w-6 text-emerald-600" />
                <span className="text-sm font-semibold">Android</span>
                <span className="text-[10px] text-gray-500">Google Play · 45MB</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-emerald-200 hover:bg-emerald-50">
                <Apple className="h-6 w-6 text-emerald-600" />
                <span className="text-sm font-semibold">iOS</span>
                <span className="text-[10px] text-gray-500">App Store · 52MB</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Passageiro App — Native download */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-2" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                  <User className="h-5 w-5" />
                </div>
                App Passageiro
                <Badge variant="outline" className="text-[10px] ml-1">v3.2.0</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Solicite corridas, acompanhe em tempo real e pague com CashBack. Mobilidade urbana com economia.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {passengerFeatures.map((feature, i) => (
                <div key={i} className="bg-teal-50 rounded-lg p-3 text-center">
                  <feature.icon className="h-5 w-5 text-teal-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-900">{feature.label}</p>
                  <p className="text-[10px] text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Download Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-teal-200 hover:bg-teal-50">
                <Smartphone className="h-6 w-6 text-teal-600" />
                <span className="text-sm font-semibold">Android</span>
                <span className="text-[10px] text-gray-500">Google Play · 38MB</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-teal-200 hover:bg-teal-50">
                <Apple className="h-6 w-6 text-teal-600" />
                <span className="text-sm font-semibold">iOS</span>
                <span className="text-[10px] text-gray-500">App Store · 44MB</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* QR Code Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0">
                <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-emerald-300">
                  <QrCode className="h-20 w-20 text-emerald-600" />
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-bold text-gray-900 text-lg">Download Rápido</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Aponte a câmera do seu celular para o QR Code e faça o download instantâneo do app.
                </p>
                <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Smartphone className="h-3 w-3" />
                    Android 8+
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Apple className="h-3 w-3" />
                    iOS 14+
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* What's New */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-emerald-600" />
              Novidades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsNew.map((release, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">v{release.version}</Badge>
                  <span className="text-xs text-gray-400">{release.date}</span>
                  {i === 0 && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">ATUAL</Badge>
                  )}
                </div>
                <ul className="space-y-1">
                  {release.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* App Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-gray-900 text-sm">Alta Performance</h4>
            <p className="text-xs text-gray-500 mt-1">Apps otimizados para funcionar mesmo com conexão lenta</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-gray-900 text-sm">Seguro e Privado</h4>
            <p className="text-xs text-gray-500 mt-1">Seus dados protegidos com criptografia de ponta</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
