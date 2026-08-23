import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// The supabase SDK (~58 kB gzip) is deferred behind a dynamic import so it
// never blocks first paint / initial parse. Auth state resolves moments later,
// exactly like the network round-trip it wraps anyway.
let clientPromise: Promise<SupabaseClient | null> | null = null

/** Lazily loads and memoizes the Supabase client; resolves to null when unconfigured. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured || !url || !anonKey) return Promise.resolve(null)
  if (!clientPromise) {
    // Dynamic import targets our own wrapper module (not the bare package) so
    // the bundler reliably emits it as a separate deferred chunk.
    clientPromise = import('./supabaseClient')
      .then((m) => m.client)
      .catch((err) => {
        console.warn('[supabase] failed to load SDK:', err)
        return null
      })
  }
  return clientPromise
}
