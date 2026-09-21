/**
 * Qualification options used across the platform.
 *
 * Task 2-e (Item 4): expanded the dropdown from 6 hardcoded options
 * (motorista / passageiro / passageiro_60 / passageiro_pcd / comercio /
 * entregador) to 10 business-relevant qualifications per the client spec:
 *
 *   Motorista, Entregador, Cliente, Lojista, Mototaxista, Motofretista,
 *   Motorista de App, Taxista, Caminhoneiro, Outros
 *
 * The values are stable string codes — never change them (they are
 * persisted on the User.qualification column and used by the gratifications
 * module to gate the "Metas" section). The labels are PT-BR human-readable
 * strings shown in every UI that lists qualifications:
 *
 *   - Admin "Editar Usuário" dialog (admin-users-panel.tsx)
 *   - User backoffice "Dados Pessoais" card (personal-data-section.tsx)
 *   - Self-registration dropdown (register-page.tsx)
 *
 * Legacy qualification codes (motorista / passageiro / passageiro_60 /
 * passageiro_pcd / comercio / entregador) are still recognised by
 * `qualificationLabel()` so users registered before the expansion don't
 * see a raw code in their profile.
 */
export interface QualificationOption {
  value: string
  label: string
}

export const QUALIFICATION_OPTIONS: readonly QualificationOption[] = [
  { value: 'motorista', label: 'Motorista' },
  { value: 'entregador', label: 'Entregador' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'lojista', label: 'Lojista' },
  { value: 'mototaxista', label: 'Mototaxista' },
  { value: 'motofretista', label: 'Motofretista' },
  { value: 'motorista_app', label: 'Motorista de App' },
  { value: 'taxista', label: 'Taxista' },
  { value: 'caminhoneiro', label: 'Caminhoneiro' },
  { value: 'outros', label: 'Outros' },
] as const

/**
 * Legacy qualification codes that existed before Task 2-e. Kept here so the
 * `qualificationLabel()` helper can render a friendly PT-BR label for users
 * registered under the old dropdown (instead of showing the raw code).
 */
export const LEGACY_QUALIFICATION_OPTIONS: readonly QualificationOption[] = [
  { value: 'passageiro', label: 'Passageiro' },
  { value: 'passageiro_60', label: 'Passageiro 60+' },
  { value: 'passageiro_pcd', label: 'Passageiro com Mobilidade Reduzida' },
  { value: 'comercio', label: 'Comércio' },
] as const

/**
 * Resolve a qualification code to its human-readable PT-BR label.
 *
 * Looks up the current options first, then falls back to the legacy table,
 * and finally returns the raw value (so the user always sees something).
 * Returns '—' for null/undefined so callers can render an "empty" dash.
 */
export function qualificationLabel(value?: string | null): string {
  if (!value) return '—'
  const current = QUALIFICATION_OPTIONS.find((o) => o.value === value)
  if (current) return current.label
  const legacy = LEGACY_QUALIFICATION_OPTIONS.find((o) => o.value === value)
  if (legacy) return legacy.label
  return value
}

// ============================================================================
// Category groups — used by the sidebar / page-level access control to decide
// which menu items and features each qualification category can see.
// ----------------------------------------------------------------------------
// The "trava de visualização" (view lock) works as follows:
//
//   1. DRIVER_QUALIFICATIONS — categories that transport passengers.
//      These see the "Metas" (driver goals) card and ride-related metrics.
//      Includes: motorista, mototaxista, motorista_app, taxista
//
//   2. DELIVERY_QUALIFICATIONS — categories that transport cargo/packages.
//      These also see the "Metas" card (delivery goals) and delivery metrics.
//      Includes: entregador, motofretista, caminhoneiro
//
//   3. CONDUCTOR_QUALIFICATIONS — union of DRIVER + DELIVERY (anyone who
//      drives for a living). Used to gate the Metas module as a whole
//      (motorista/entregador equivalent).
//
//   4. LOJISTA_QUALIFICATIONS — merchant/store-owner categories.
//      These see the "Portal do Lojista" menu and store-management tools.
//      Includes: lojista (and legacy 'comercio')
//
//   5. CLIENT_QUALIFICATIONS — end-user / consumer categories.
//      These see the standard consumer backoffice (no driver goals, no
//      store portal). Includes: cliente (and legacy passageiro variants)
//
// Legacy codes (passageiro, passageiro_60, passageiro_pcd, comercio) are
// mapped to their new-equivalent groups so users registered under the old
// dropdown keep the same access they had before.
// ============================================================================

export const DRIVER_QUALIFICATIONS: readonly string[] = [
  'motorista',
  'mototaxista',
  'motorista_app',
  'taxista',
] as const

export const DELIVERY_QUALIFICATIONS: readonly string[] = [
  'entregador',
  'motofretista',
  'caminhoneiro',
] as const

export const CONDUCTOR_QUALIFICATIONS: readonly string[] = [
  ...DRIVER_QUALIFICATIONS,
  ...DELIVERY_QUALIFICATIONS,
] as const

export const LOJISTA_QUALIFICATIONS: readonly string[] = [
  'lojista',
  'comercio', // legacy code
] as const

export const CLIENT_QUALIFICATIONS: readonly string[] = [
  'cliente',
  'passageiro',     // legacy
  'passageiro_60',  // legacy
  'passageiro_pcd', // legacy
] as const

/**
 * Check if a user (by qualification code) is a "driver" — transports
 * passengers. Used by the sidebar to decide if the Metas card should be
 * visible (when combined with the admin `allowedQualifications` config).
 *
 * Returns true for: motorista, mototaxista, motorista_app, taxista.
 */
export function isDriverQualification(qualification?: string | null): boolean {
  if (!qualification) return false
  return (DRIVER_QUALIFICATIONS as readonly string[]).includes(qualification.toLowerCase())
}

/**
 * Check if a user (by qualification code) is a "delivery" worker —
 * transports cargo/packages. Used by the sidebar to decide if the Metas
 * card should be visible (when combined with the admin config).
 *
 * Returns true for: entregador, motofretista, caminhoneiro.
 */
export function isDeliveryQualification(qualification?: string | null): boolean {
  if (!qualification) return false
  return (DELIVERY_QUALIFICATIONS as readonly string[]).includes(qualification.toLowerCase())
}

/**
 * Check if a user (by qualification code) is any kind of conductor —
 * driver OR delivery worker. This is the "motorista/entregador equivalent"
 * check used to gate the Metas module as a whole.
 *
 * Returns true for: motorista, entregador, mototaxista, motofretista,
 * motorista_app, taxista, caminhoneiro.
 */
export function isConductorQualification(qualification?: string | null): boolean {
  return isDriverQualification(qualification) || isDeliveryQualification(qualification)
}

/**
 * Check if a user (by qualification code) is a lojista (merchant).
 * Returns true for: lojista, comercio (legacy).
 */
export function isLojistaQualification(qualification?: string | null): boolean {
  if (!qualification) return false
  return (LOJISTA_QUALIFICATIONS as readonly string[]).includes(qualification.toLowerCase())
}

/**
 * Check if a user (by qualification code) is a regular client/consumer.
 * Returns true for: cliente, passageiro, passageiro_60, passageiro_pcd.
 */
export function isClientQualification(qualification?: string | null): boolean {
  if (!qualification) return false
  return (CLIENT_QUALIFICATIONS as readonly string[]).includes(qualification.toLowerCase())
}

/**
 * Resolve a user's qualification from multiple possible fields.
 *
 * Different parts of the system store the qualification in different places:
 *   - `user.qualification` (string, set by admin or self-registration)
 *   - `user.userType` (string, set when admin picks a UserType row)
 *   - `user.isDriver` / `user.isDelivery` (legacy boolean flags)
 *
 * This helper centralises the resolution so the sidebar / page access
 * control doesn't need to repeat the same fallback chain everywhere.
 *
 * Returns the lowercase qualification code (e.g. 'motorista') or '' if
 * none can be determined.
 */
export function resolveUserQualification(user: {
  qualification?: string | null
  userType?: string | null
  isDriver?: boolean | null
  isDelivery?: boolean | null
} | null | undefined): string {
  if (!user) return ''
  // Prefer the explicit qualification field
  if (user.qualification) return user.qualification.toLowerCase()
  // Fall back to userType (admin-assigned UserType.code)
  if (user.userType) return user.userType.toLowerCase()
  // Legacy boolean flags — derive the closest code
  if (user.isDriver) return 'motorista'
  if (user.isDelivery) return 'entregador'
  return ''
}
