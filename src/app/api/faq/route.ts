import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public GET — list all active FAQs for end users
// No authentication required: this endpoint only returns `isActive: true` rows
// ordered by sortOrder (ascending) then createdAt (ascending). It mirrors what
// admin users manage via /api/admin/faq so that admin edits become visible to
// regular users on the support page.
export async function GET() {
  try {
    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ faqs })
  } catch (error) {
    console.error('FAQ fetch error:', error)
    // Always return a successful 200 with an empty list so the client UI
    // never crashes when the database is unavailable.
    return NextResponse.json({ faqs: [] })
  }
}
