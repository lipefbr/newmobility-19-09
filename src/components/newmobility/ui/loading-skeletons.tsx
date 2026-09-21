'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Dashboard Skeleton - Matches the dashboard layout
 * (welcome bar, 4 quick action buttons, 4 stats cards, 6 financial cards, 2 chart areas)
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome bar skeleton */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 relative">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <Skeleton className="h-7 w-64 bg-white/20 rounded-lg" />
                <div className="flex items-center gap-3 mt-2">
                  <Skeleton className="h-4 w-32 bg-white/20 rounded" />
                  <Skeleton className="h-5 w-16 bg-white/20 rounded-full" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-56 bg-white/20 rounded-lg" />
                <Skeleton className="h-8 w-56 bg-white/20 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4">
            <Skeleton className="h-8 w-8 rounded-lg mb-2" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-7 w-24 mb-1 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Network overview + plan progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40 rounded" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center p-3 rounded-xl">
                  <Skeleton className="h-6 w-6 rounded mx-auto mb-1" />
                  <Skeleton className="h-7 w-12 rounded mx-auto mb-1" />
                  <Skeleton className="h-3 w-16 rounded mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <Skeleton className="h-3 w-24 rounded mb-2" />
            <Skeleton className="h-6 w-20 rounded mb-3" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="mt-3 pt-3 border-t">
              <Skeleton className="h-3 w-32 rounded mb-1" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial cards skeleton */}
      <div>
        <Skeleton className="h-6 w-32 mb-3 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-6 w-24 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts + activity skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-36 rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 rounded mb-1" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-36 rounded" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-3 flex flex-col items-center gap-1.5">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-14 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-36 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Table Skeleton - Generic table skeleton with configurable rows
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Card className="shadow-sm">
      {/* Table header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded flex-1" />
          ))}
        </div>
      </div>
      {/* Table rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={`h-4 rounded flex-1 ${colIdx === 0 ? 'max-w-[140px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * CardGridSkeleton - Grid of skeleton cards
 */
export function CardGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns] || gridCols[3]} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 rounded mb-1" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded mb-2" />
            <Skeleton className="h-3 w-28 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * ProfileSkeleton - Matches the profile page layout
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-36 rounded mb-1" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {/* Profile card */}
      <Card className="shadow-sm overflow-hidden">
        <Skeleton className="h-24 w-full rounded-none" />
        <CardContent className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <Skeleton className="h-20 w-20 rounded-full border-4 border-white shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-6 w-48 rounded mb-1" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg p-3 text-center">
                  <Skeleton className="h-4 w-4 rounded mx-auto mb-1" />
                  <Skeleton className="h-5 w-16 rounded mx-auto mb-1" />
                  <Skeleton className="h-3 w-14 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs skeleton */}
      <div>
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-lg" />
          ))}
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-40 rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-20 rounded mb-2" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-40 rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Referrals Skeleton - Matches the referrals page layout
 */
export function ReferralsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-36 rounded mb-1" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>

      {/* Referral link card */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="h-8 w-8 rounded-lg mb-2" />
              <Skeleton className="h-7 w-12 rounded mb-1" />
              <Skeleton className="h-3 w-20 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Network tree */}
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-40 rounded" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-px h-6" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                {Array.from({ length: 3 + i }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-10 rounded-full" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search + filters */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>

      {/* List */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 rounded mb-1" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Financial Skeleton - Matches the financial page layout
 */
export function FinancialSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-7 w-36 rounded mb-1" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="h-3 w-28 rounded mb-2" />
              <Skeleton className="h-6 w-24 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24 rounded mb-1" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-28 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40 rounded mb-1" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
