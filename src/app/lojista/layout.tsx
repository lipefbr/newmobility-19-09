// ============================================================================
// /lojista/layout.tsx — Wrapper for all /lojista/* pages
// ----------------------------------------------------------------------------
// Prevents horizontal scroll on lojista pages by clamping overflow-x.
// ============================================================================

export default function LojistaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="overflow-x-hidden">{children}</div>
}
