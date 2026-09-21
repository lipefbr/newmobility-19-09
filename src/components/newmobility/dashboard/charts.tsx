'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { motion } from 'framer-motion'
import { BarChart3, PieChart as PieChartIcon, FileText } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useStore, type PageKey } from '@/lib/store'

interface DashboardChartsProps {
  data: any | null
}

const defaultUserDistribution = [
  { name: 'Diretos', value: 4, color: '#059669' },
  { name: 'Nível 2', value: 16, color: '#10b981' },
  { name: 'Nível 3', value: 64, color: '#34d399' },
  { name: 'Nível 4', value: 256, color: '#6ee7b7' },
  { name: 'Nível 5', value: 1024, color: '#a7f3d0' },
]

const defaultRevenueData = [
  { name: 'Entrada', valor: 32580, color: '#059669' },
  { name: 'Residual', valor: 18240, color: '#10b981' },
  { name: 'Gratific.', valor: 8450, color: '#f59e0b' },
  { name: 'Mobilidade', valor: 7270, color: '#3b82f6' },
  { name: 'Farmácia', valor: 5580, color: '#f43f5e' },
  { name: 'Refeição', valor: 6870, color: '#f97316' },
  { name: 'Shopping', valor: 27270, color: '#8b5cf6' },
]

const userColorMap: Record<string, string> = {
  'Diretos': '#059669',
  'Nível 2': '#10b981',
  'Nível 3': '#34d399',
  'Nível 4': '#6ee7b7',
  'Nível 5': '#a7f3d0',
  // Per-user downline distribution (descendants grouped by plan)
  'Gratuito': '#34d399',
  'Blue 3': '#10b981',
  'Blue 5 Premium': '#059669',
  'blue5': '#059669',
  'blue3': '#10b981',
  'free': '#34d399',
}

const revenueColorMap: Record<string, string> = {
  'Entrada': '#059669',
  'Residual': '#10b981',
  'Gratific.': '#f59e0b',
  'Gratificação': '#f59e0b',
  'Mobilidade': '#3b82f6',
  'Farmácia': '#f43f5e',
  'Refeição': '#f97316',
  'Shopping': '#8b5cf6',
  'Compras': '#8b5cf6',
  'Contas': '#0ea5e9',
  'CashBack': '#059669',
  'Taxa de Saque': '#dc2626',
  'Upgrade de Plano': '#6366f1',
  'Saque': '#dc2626',
  'Pagamento Fatura': '#06b6d4',
  'Depósito': '#22c55e',
  'Voucher': '#ec4899',
  'Bônus': '#eab308',
  'Outros': '#6b7280',
  'plan_upgrade': '#059669',
  'withdrawal': '#10b981',
  'mobility': '#3b82f6',
  'food': '#f97316',
  'pharmacy': '#f43f5e',
  'shopping': '#8b5cf6',
  'gratification': '#f59e0b',
  'plan_blue3': '#34d399',
  'bills': '#0ea5e9',
  'cashback': '#059669',
  'withdrawal_fee': '#dc2626',
  'meal': '#f97316',
  'paymentInvoice': '#06b6d4',
  'deposit': '#22c55e',
  'voucher': '#ec4899',
  'bonus': '#eab308',
  'other': '#6b7280',
}

const nameTranslations: Record<string, string> = {
  'plan_upgrade': 'Upgrade de Plano',
  'withdrawal': 'Saque',
  'mobility': 'Mobilidade',
  'food': 'Refeição',
  'pharmacy': 'Farmácia',
  'shopping': 'Compras',
  'gratification': 'Gratificação',
  'plan_blue3': 'Blue 3',
  'blue5': 'Blue 5 Premium',
  'blue3': 'Blue 3',
  'free': 'Gratuito',
  // Per-user category labels (must match financial-page.tsx categoryLabels)
  'bills': 'Contas',
  'cashback': 'CashBack',
  'withdrawal_fee': 'Taxa de Saque',
  'meal': 'Refeição',
  'paymentInvoice': 'Pagamento Fatura',
  'free_balance': 'Saldo Livre',
  'deposit': 'Depósito',
  'voucher': 'Voucher',
  'bonus': 'Bônus',
  'other': 'Outros',
}

const RADIAN = Math.PI / 180

// Page navigation mapping for clickable chart segments.
// Updated for the per-user downline distribution: plan keys (free / blue3 /
// blue5) navigate to the referrals page so users can inspect their downline.
const segmentPageMap: Record<string, PageKey> = {
  'Diretos': 'referrals',
  'Nível 2': 'referrals',
  'Nível 3': 'referrals',
  'Nível 4': 'referrals',
  'Nível 5': 'referrals',
  'Gratuito': 'referrals',
  'Blue 3': 'referrals',
  'Blue 5 Premium': 'referrals',
  'Entrada': 'cashback',
  'Residual': 'cashback',
  'Gratificação': 'gratifications',
  'Mobilidade': 'financial',
  'Farmácia': 'financial',
  'Refeição': 'financial',
  'Compras': 'financial',
  'Contas': 'financial',
  'CashBack': 'cashback',
  'Taxa de Saque': 'financial',
  'Upgrade de Plano': 'myplan',
  'Saque': 'financial',
  'Pagamento Fatura': 'financial',
  'Depósito': 'financial',
  'Voucher': 'voucher',
  'Bônus': 'financial',
}

function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function normalizeToArray(obj: any, colorMap: Record<string, string>, nameMap: Record<string, string>, valueKey: string): any[] {
  if (Array.isArray(obj)) {
    if (obj.length === 0) return []
    return obj.map((item: any) => ({
      name: nameMap[item.name] || item.name || 'Outros',
      [valueKey]: typeof item[valueKey] === 'number' ? item[valueKey] : (typeof item.value === 'number' ? item.value : 0),
      color: item.color || colorMap[item.name] || '#6b7280',
    }))
  }
  
  if (!obj || typeof obj !== 'object') return []
  
  const entries = Object.entries(obj)
  if (entries.length === 0) return []
  
  return entries.map(([key, value]) => ({
    name: nameMap[key] || key,
    [valueKey]: typeof value === 'number' ? value : 0,
    color: colorMap[key] || '#6b7280',
  })).filter(item => (item as any)[valueKey] > 0)
}

function EmptyChartState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[280px] md:h-[320px] text-muted-foreground">
      <Icon className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

// Custom tooltip for pie chart
function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.color }} />
        <span className="text-sm font-semibold text-foreground">{data.name}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {data.value} {data.value === 1 ? 'usuário' : 'usuários'}
      </p>
      <p className="text-xs text-emerald-600 font-medium">
        {((data.payload.percent || 0) * 100).toFixed(1)}% do total
      </p>
      <p className="text-[10px] text-muted-foreground mt-1 border-t border-border pt-1">
        Clique para ver indicações
      </p>
    </div>
  )
}

// Custom tooltip for bar chart
function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  const name = data.payload.name
  const page = segmentPageMap[name]
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.color }} />
        <span className="text-sm font-semibold text-foreground">{name}</span>
      </div>
      <p className="text-sm text-foreground font-bold">
        R$ {(data.value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-emerald-600 font-medium">
        {((data.payload.percent || 0) * 100).toFixed(1)}% do total
      </p>
      {page && (
        <p className="text-[10px] text-muted-foreground mt-1 border-t border-border pt-1">
          Clique para ver detalhes →
        </p>
      )}
    </div>
  )
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const { t } = useTranslation()
  const { setActivePage } = useStore()

  const userDistributionData = data?.userDistribution 
    ? normalizeToArray(data.userDistribution, userColorMap, nameTranslations, 'value')
    : defaultUserDistribution
  
  const revenueByCategoryData = data?.revenueByCategory
    ? normalizeToArray(data.revenueByCategory, revenueColorMap, nameTranslations, 'valor')
    : defaultRevenueData

  const hasUserData = userDistributionData.length > 0
  const hasRevenueData = revenueByCategoryData.length > 0

  const handlePieClick = (data: any) => {
    if (data?.name) {
      const page = segmentPageMap[data.name]
      if (page) setActivePage(page)
    }
  }

  const handleBarClick = (data: any) => {
    if (data?.name) {
      const page = segmentPageMap[data.name]
      if (page) setActivePage(page)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Pie Chart */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card className="rounded-2xl shadow-sm bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-emerald-600" />
                {t('dashboard.charts.users')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs text-muted-foreground hover:text-emerald-600 gap-1"
                onClick={() => setActivePage('referrals')}
              >
                <FileText className="h-3.5 w-3.5" />
                {t('dashboard.charts.viewReport')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hasUserData ? (
              <div className="h-[280px] md:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={115}
                      innerRadius={55}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1200}
                      onClick={handlePieClick}
                      className="cursor-pointer"
                    >
                      {userDistributionData.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          className="transition-opacity hover:opacity-80"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-xs text-muted-foreground cursor-pointer hover:text-emerald-600 transition-colors">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState
                icon={PieChartIcon}
                title={t('charts.noDistributionData')}
                description={t('charts.distributionDesc')}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bar Chart */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="rounded-2xl shadow-sm bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                {t('dashboard.charts.revenue')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs text-muted-foreground hover:text-emerald-600 gap-1"
                onClick={() => setActivePage('financial')}
              >
                <FileText className="h-3.5 w-3.5" />
                {t('dashboard.charts.viewReport')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hasRevenueData ? (
              <div className="h-[280px] md:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueByCategoryData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="valor"
                      radius={[6, 6, 0, 0]}
                      animationBegin={0}
                      animationDuration={1200}
                      onClick={handleBarClick}
                      className="cursor-pointer"
                    >
                      {revenueByCategoryData.map((entry: any, index: number) => (
                        <Cell 
                          key={`bar-${index}`} 
                          fill={entry.color}
                          className="transition-opacity hover:opacity-80"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState
                icon={BarChart3}
                title={t('charts.noRevenueData')}
                description={t('charts.revenueDesc')}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
