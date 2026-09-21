/**
 * Safe Brazilian currency formatter.
 *
 * Accepts cents (number | null | undefined) and never returns "R$ NaN":
 * any non-numeric input is treated as 0. Use this anywhere a voucher,
 * balance, withdrawal or transaction amount is rendered to the user.
 *
 *   formatBRL(3258000)   -> "R$ 32.580,00"
 *   formatBRL(undefined) -> "R$ 0,00"
 *   formatBRL(NaN)       -> "R$ 0,00"
 *   formatBRL(null)      -> "R$ 0,00"
 */
export function formatBRL(cents: number | null | undefined): string {
  const safe =
    typeof cents === 'number' && !isNaN(cents) && isFinite(cents)
      ? cents
      : 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safe / 100)
}

/**
 * Parse a Portuguese-formatted BRL string ("1.234,56" or "1234,56" or
 * "1234.56") into cents. Returns 0 if the input cannot be parsed.
 *
 *   parseBrlToCents("1.234,56") -> 123456
 *   parseBrlToCents("50,00")    -> 5000
 *   parseBrlToCents("")         -> 0
 */
export function parseBrlToCents(input: string | null | undefined): number {
  if (!input) return 0
  const cleaned = String(input)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '') // strip thousands-separator dots
    .replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : Math.round(n * 100)
}
