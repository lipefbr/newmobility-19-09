// ============================================================================
// content-texts.ts — Client-side cache of dynamic platform texts/labels
// ----------------------------------------------------------------------------
// Fetches the { [key]: value } map once from /api/content-texts and caches it
// in memory. Use getText(key, fallback) in any component to look up an
// admin-editable label without re-rendering or refetching.
//
// After an admin saves a content text via /api/admin/content-texts, call
// invalidateContentTexts() so the next getText() reloads the new value.
// ============================================================================

let cache: Record<string, string> | null = null
let inflight: Promise<Record<string, string>> | null = null

/**
 * Returns the cached content-texts map, fetching it from the API on first
 * call. Safe to call from any client component. Multiple concurrent callers
 * share the same in-flight promise (dedupes requests).
 */
export async function getContentTexts(): Promise<Record<string, string>> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch('/api/content-texts', { cache: 'no-store' })
      if (!res.ok) {
        cache = {}
        return cache
      }
      const data = (await res.json()) as Record<string, string> | { error?: string }
      // The API returns either the flat map (success) or { error: string }
      cache = data && !('error' in data) ? data : {}
      return cache
    } catch {
      cache = {}
      return cache
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/**
 * Synchronous lookup with a fallback. Returns the cached value if present,
 * otherwise the fallback. Make sure to call preloadContentTexts() (or
 * getContentTexts()) somewhere early in the app lifecycle so the cache is
 * populated before synchronous getText() calls.
 */
export function getText(key: string, fallback: string): string {
  if (cache && cache[key]) return cache[key]
  return fallback
}

/**
 * Clears the in-memory cache so the next call to getContentTexts() refetches
 * from the server. Call this after an admin save to ensure the new value is
 * visible without a full page reload.
 */
export function invalidateContentTexts() {
  cache = null
  inflight = null
}

/**
 * Preload the cache at app start. Call from a top-level client component
 * (e.g. the app-layout or root page) so the synchronous getText() helper
 * works on first render.
 */
export async function preloadContentTexts() {
  await getContentTexts()
}
