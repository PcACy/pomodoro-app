import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/**
 * Own module so the bundler can split the heavy SDK into a deferred chunk:
 * this file is only reached via the dynamic import in `supabase.ts`.
 */
export const client = createClient(url, anonKey)
