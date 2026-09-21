import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { success, error } from '@/lib/api-utils'

// ============================================================================
// /api/service-types
// ----------------------------------------------------------------------------
// Public endpoint (no auth required) used by the user-facing Services module
// (Escritório Virtual) to populate the category dropdown and filter chips.
//
// GET → returns only ACTIVE service types from the ServiceType table,
//       ordered by sortOrder then name.
//
// IMPORTANTE: NÃO sedia mais categorias padrão automaticamente. Se a tabela
// estiver vazia, retorna { types: [] } — o admin deve popular via painel
// "Tipos de Serviço". Isso garante que a lista exibida reflita EXCLUSIVAMENTE
// o que o admin cadastrou (não há mais lista hardcoded no código-fonte).
// ============================================================================

export async function GET(_req: NextRequest) {
  try {
    const types = await prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, icon: true, sortOrder: true },
    })

    return success({ types })
  } catch (err) {
    console.error('Public service-types GET error:', err)
    // Em caso de erro de DB, retorna lista vazia (não mais fallback estático).
    // O admin deve garantir que o banco está acessível.
    return success({ types: [] })
  }
}

export async function POST() {
  return error('Method Not Allowed', 405)
}
