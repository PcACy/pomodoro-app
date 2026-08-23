import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export interface GitHubProfile {
  name: string
  avatarUrl: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    let disposed = false
    let unsubscribe: (() => void) | null = null
    void getSupabase().then((sb) => {
      if (disposed) return
      if (!sb) {
        setLoading(false)
        return
      }
      void sb.auth
        .getSession()
        .then(({ data }) => {
          if (!disposed) setUser(data.session?.user ?? null)
        })
        .finally(() => {
          if (!disposed) setLoading(false)
        })

      const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      unsubscribe = () => sub.subscription.unsubscribe()
    })

    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [])

  const login = useCallback(async () => {
    const sb = await getSupabase()
    if (!sb) return
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    })
    if (error) console.error('[auth] GitHub login failed:', error.message)
  }, [])

  const logout = useCallback(async () => {
    const sb = await getSupabase()
    if (!sb) return
    const { error } = await sb.auth.signOut()
    if (error) console.error('[auth] logout failed:', error.message)
  }, [])

  const profile: GitHubProfile | null = useMemo(
    () =>
      user
        ? {
            name: String(
              user.user_metadata?.user_name ??
                user.user_metadata?.name ??
                user.user_metadata?.full_name ??
                user.identities?.[0]?.identity_data?.user_name ??
                user.identities?.[0]?.identity_data?.name ??
                user.email ??
                '',
            ),
            avatarUrl: String(
              user.user_metadata?.avatar_url ??
                user.user_metadata?.avatarUrl ??
                user.user_metadata?.picture ??
                user.identities?.[0]?.identity_data?.avatar_url ??
                '',
            ),
          }
        : null,
    [user],
  )

  return { user, profile, loading, login, logout, available: isSupabaseConfigured }
}