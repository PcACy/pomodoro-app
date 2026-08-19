import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface GitHubProfile {
  name: string
  avatarUrl: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let disposed = false
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!disposed) setUser(data.session?.user ?? null)
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      disposed = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    })
    if (error) console.error('[auth] GitHub login failed:', error.message)
  }, [])

  const logout = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[auth] logout failed:', error.message)
  }, [])

  const profile: GitHubProfile | null = user
    ? {
        name: String(
          user.user_metadata?.user_name ??
            user.user_metadata?.name ??
            user.user_metadata?.full_name ??
            user.email ??
            '',
        ),
        avatarUrl: String(user.user_metadata?.avatar_url ?? ''),
      }
    : null

  return { user, profile, loading, login, logout, available: isSupabaseConfigured }
}