export interface ParsedAuthUrl {
  code?: string
  accessToken?: string
  refreshToken?: string
  error?: string
  errorDescription?: string
}

/**
 * Extracts OAuth code, tokens, and errors from deep link or web redirect URLs.
 * Handles both custom schemes (com.pomau.app://, pomau://) and standard HTTP(S) URLs.
 */
export function parseAuthUrl(rawUrl: string): ParsedAuthUrl {
  if (!rawUrl || typeof rawUrl !== 'string') return {}

  try {
    // Normalise scheme for URL parser so custom schemes like com.pomau.app:// don't fail
    const normalized = rawUrl.replace(/^[a-zA-Z0-9_.-]+:\/\/?/, 'https://dummy.local/')
    const parsed = new URL(normalized)

    const search = parsed.searchParams
    const hashStr = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
    const hash = new URLSearchParams(hashStr)

    const code = search.get('code') || hash.get('code') || undefined
    const accessToken = hash.get('access_token') || search.get('access_token') || undefined
    const refreshToken = hash.get('refresh_token') || search.get('refresh_token') || undefined
    const error = search.get('error') || hash.get('error') || undefined
    const errorDescription = search.get('error_description') || hash.get('error_description') || undefined

    return { code, accessToken, refreshToken, error, errorDescription }
  } catch (err) {
    console.error('[auth] Failed to parse auth URL:', rawUrl, err)
    return {}
  }
}

