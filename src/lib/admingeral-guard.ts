import { prisma } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// Admin guard for the /admingeral panel.
//
// The /admingeral panel is for APP-side administration (categories, stores,
// products, banners, orders, drivers, app users, config). It is SEPARATE from
// the MMN backoffice at / which uses role='admin' too — but here we also
// accept userType='admin' so a dedicated "app admin" account can be created
// without giving MMN backoffice access.
//
// Usage:
//   const admin = await requireAppAdmin(userId)
//   if (!admin) return error('Unauthorized', 403)
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAppAdmin(userId: string | null) {
  if (!userId) return null
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      userType: true,
      profileImage: true,
    },
  })
  if (!admin) return null
  // Accept either role='admin' (full admin) OR userType='admin' (app admin)
  if (admin.role !== 'admin' && admin.userType !== 'admin') {
    return null
  }
  return admin
}

export type AppAdmin = Awaited<ReturnType<typeof requireAppAdmin>>
