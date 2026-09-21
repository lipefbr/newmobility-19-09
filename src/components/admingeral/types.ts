'use client'

import { ReactNode } from 'react'

// Shared types for the admingeral panel.

export type Section =
  | 'dashboard'
  | 'categorias'
  | 'lojas'
  | 'produtos'
  | 'banners'
  | 'pedidos'
  | 'motoristas'
  | 'usuarios'
  | 'config'

export interface NavItem {
  key: Section
  label: string
  icon: ReactNode
  badgeKey?: 'drivers' | 'stores' | 'orders'
}

export interface DashboardData {
  users: { clientes: number; motoristas: number; lojistas: number; entregadores: number }
  stores: { total: number; active: number; pendingApprovals: number }
  products: { total: number }
  orders: { total: number; pending: number; today: number; week: number }
  revenue: { todayCents: number; weekCents: number }
  banners: { total: number; active: number }
  categories: { total: number; active: number }
  drivers: { pending: number; approved: number }
  recentOrders: Array<{
    id: string
    number: string
    status: string
    totalCents: number
    createdAt: string
    store: { name: string }
    customer: { name: string }
  }>
}

export const formatBRL = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
