// ============================================================================
// /motorista/layout.tsx — Wrapper for all /motorista/* pages
// ----------------------------------------------------------------------------
// Prevents horizontal scroll on motorista pages by clamping overflow-x.
// ============================================================================

export default function MotoristaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="overflow-x-hidden">{children}</div>
}
