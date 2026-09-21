// Shared in-memory store for password reset codes
// In production, this would be stored in the database or a cache like Redis
export const resetCodes = new Map<string, { code: string; expires: number }>()
