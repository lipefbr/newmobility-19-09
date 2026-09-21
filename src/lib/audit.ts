import { prisma } from '@/lib/db'

/**
 * Writes a single audit-log row for an admin action.
 *
 * Actions tracked (per task spec):
 *   user_edit | user_block | kyc_approve | kyc_reject
 *   | withdrawal_approve | withdrawal_reject | login_as
 *   | config_change | voucher_create | announcement_create | user_view
 *
 * Failures are swallowed (only logged to stderr) so that calling code never
 * breaks the user-facing flow just because the audit row could not be saved.
 */
export async function logAudit(params: {
  adminId: string
  adminName?: string | null
  action: string
  targetUserId?: string | null
  targetEmail?: string | null
  details?: string | null
  ipAddress?: string | null
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: params.adminId,
        adminName: params.adminName ?? null,
        action: params.action,
        targetUserId: params.targetUserId ?? null,
        targetEmail: params.targetEmail ?? null,
        details: params.details ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (e) {
    console.error('Failed to write audit log:', e)
  }
}
