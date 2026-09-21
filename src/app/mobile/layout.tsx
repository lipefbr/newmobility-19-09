// ============================================================================
// /mobile/layout.tsx — Wrapper for all /mobile/* pages (SERVER COMPONENT)
// ----------------------------------------------------------------------------
// Just prevents horizontal scroll on mobile pages by clamping overflow-x.
// No desktop redirect here — that caused hydration mismatch errors in
// production ("Application error: a client-side exception") because
// useState(getIsMobile) returns null on SSR but true on client.
//
// Desktop redirect is handled by /mobile/login (which redirects to / on
// desktop) and by individual mobile pages (which redirect to /mobile/login
// if the user is not authenticated).
// ============================================================================

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="overflow-x-hidden">{children}</div>
}
