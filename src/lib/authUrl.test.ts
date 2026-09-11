import { describe, expect, it } from 'vitest'
import { parseAuthUrl } from './authUrl'

describe('parseAuthUrl', () => {
  it('extracts PKCE code from custom scheme query params', () => {
    const res = parseAuthUrl('com.pomau.app://auth-callback?code=pkce-auth-code-123')
    expect(res.code).toBe('pkce-auth-code-123')
    expect(res.accessToken).toBeUndefined()
    expect(res.refreshToken).toBeUndefined()
  })

  it('extracts implicit tokens from custom scheme hash params', () => {
    const res = parseAuthUrl(
      'com.pomau.app://auth-callback#access_token=token_abc&refresh_token=refresh_123&expires_in=3600&token_type=bearer',
    )
    expect(res.accessToken).toBe('token_abc')
    expect(res.refreshToken).toBe('refresh_123')
    expect(res.code).toBeUndefined()
  })

  it('handles pomau:// alternative scheme', () => {
    const res = parseAuthUrl('pomau://auth-callback?code=custom-code')
    expect(res.code).toBe('custom-code')
  })

  it('handles standard web URLs with hash tokens', () => {
    const res = parseAuthUrl('https://pomau.vercel.app/#access_token=token_web&refresh_token=refresh_web')
    expect(res.accessToken).toBe('token_web')
    expect(res.refreshToken).toBe('refresh_web')
  })

  it('captures OAuth error parameters', () => {
    const res = parseAuthUrl('com.pomau.app://auth-callback?error=access_denied&error_description=User+declined')
    expect(res.error).toBe('access_denied')
    expect(res.errorDescription).toBe('User declined')
  })

  it('safely handles empty or malformed strings without throwing', () => {
    expect(parseAuthUrl('')).toEqual({})
    expect(parseAuthUrl('invalid-url-string')).toEqual({})
  })
})
