import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { App, type URLOpenListenerEvent } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { parseAuthUrl } from '../lib/authUrl'

export interface GitHubProfile {
  name: string
  avatarUrl: string
}

async function processAuthRedirect(
  rawUrl: string,
  sb: SupabaseClient,
  onUserUpdated?: (user: User | null) => void,
) {
  try {
    await Browser.close()
  } catch {
    // Browser may already be closed or not open
  }

  const { code, accessToken, refreshToken, error, errorDescription } = parseAuthUrl(rawUrl)

  if (error) {
    console.error('[auth] OAuth redirect error:', error, errorDescription)
    return
  }

  if (code) {
    try {
      const { data, error: exchangeError } = await sb.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        console.error('[auth] exchangeCodeForSession failed:', exchangeError.message)
      } else if (data.session?.user) {
        onUserUpdated?.(data.session.user)
      }
    } catch (e) {
      console.error('[auth] exchangeCodeForSession unexpected error:', e)
    }
  } else if (accessToken && refreshToken) {
    try {
      const { data, error: setSessionError } = await sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (setSessionError) {
        console.error('[auth] setSession failed:', setSessionError.message)
      } else if (data.session?.user) {
        onUserUpdated?.(data.session.user)
      }
    } catch (e) {
      console.error('[auth] setSession unexpected error:', e)
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    let disposed = false
    let unsubscribe: (() => void) | null = null
    let appUrlListener: { remove: () => void } | null = null

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
        .catch((e) => {
          console.error('[auth] getSession failed:', e)
        })
        .finally(() => {
          if (!disposed) setLoading(false)
        })

      const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
        if (disposed) return
        setUser(session?.user ?? null)
      })
      unsubscribe = () => sub.subscription.unsubscribe()

      // Native deep link handling for Capacitor (Android / iOS)
      if (Capacitor.isNativePlatform()) {
        void App.getLaunchUrl().then((launchUrl) => {
          if (disposed || !launchUrl?.url) return
          void processAuthRedirect(launchUrl.url, sb, (u) => {
            if (!disposed) setUser(u)
          })
        })

        void App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
          if (disposed) return
          void processAuthRedirect(event.url, sb, (u) => {
            if (!disposed) setUser(u)
          })
        }).then((handle) => {
          if (disposed) {
            handle.remove()
          } else {
            appUrlListener = handle
          }
        })
      }
    })

    return () => {
      disposed = true
      unsubscribe?.()
      appUrlListener?.remove()
    }
  }, [])

  const login = useCallback(async () => {
    const sb = await getSupabase()
    if (!sb) return

    const isNative = Capacitor.isNativePlatform()
    const redirectTo = isNative ? 'com.pomau.app://auth-callback' : window.location.origin

    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        skipBrowserRedirect: isNative,
      },
    })

    if (error) {
      console.error('[auth] GitHub login failed:', error.message)
      return
    }

    if (isNative && data?.url) {
      await Browser.open({ url: data.url, windowName: '_self' })
    }
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