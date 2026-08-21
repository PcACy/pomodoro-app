import { afterEach, describe, expect, it, vi } from 'vitest'
import { uid, uidFrom } from './uid'

describe('uid', () => {
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  describe('uid()', () => {
    const originalCrypto = globalThis.crypto

    afterEach(() => {
      vi.restoreAllMocks()
      if (originalCrypto) {
        Object.defineProperty(globalThis, 'crypto', {
          value: originalCrypto,
          configurable: true,
          writable: true,
        })
      } else {
        // @ts-expect-error cleaning up mock
        delete globalThis.crypto
      }
    })

    it('uses crypto.randomUUID when available', () => {
      const mockRandomUUID = vi.fn().mockReturnValue('12345678-1234-4234-8234-123456789abc')
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          randomUUID: mockRandomUUID,
        },
        configurable: true,
        writable: true,
      })

      const id = uid()
      expect(mockRandomUUID).toHaveBeenCalledTimes(1)
      expect(id).toBe('12345678-1234-4234-8234-123456789abc')
    })

    it('falls back to crypto.getRandomValues when crypto.randomUUID is not available', () => {
      const mockGetRandomValues = vi.fn((buffer: Uint8Array) => {
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = i * 16
        }
        return buffer
      })

      Object.defineProperty(globalThis, 'crypto', {
        value: {
          getRandomValues: mockGetRandomValues,
        },
        configurable: true,
        writable: true,
      })

      const id = uid()
      expect(mockGetRandomValues).toHaveBeenCalledTimes(1)
      expect(id).toMatch(UUID_V4_REGEX)
    })

    it('throws an error when crypto is undefined', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
        writable: true,
      })

      expect(() => uid()).toThrow('Cryptographically secure random number generator is unavailable.')
    })

    it('throws an error when crypto contains neither randomUUID nor getRandomValues', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: {},
        configurable: true,
        writable: true,
      })

      expect(() => uid()).toThrow('Cryptographically secure random number generator is unavailable.')
    })
  })

  describe('uidFrom()', () => {
    const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    it('produces valid UUID format', () => {
      const id = uidFrom('test-input')
      expect(id).toMatch(UUID_V4_REGEX)
    })

    it('is deterministic for the same input', () => {
      const id1 = uidFrom('sample-payload-123')
      const id2 = uidFrom('sample-payload-123')
      expect(id1).toBe(id2)
    })

    it('produces different UUIDs for different inputs', () => {
      const id1 = uidFrom('input-a')
      const id2 = uidFrom('input-b')
      expect(id1).not.toBe(id2)
    })

    it('handles empty string input', () => {
      const id = uidFrom('')
      expect(id).toMatch(UUID_V4_REGEX)
    })

    it('handles unicode and long strings', () => {
      const id = uidFrom('🚀 test 123 ✨ pomodoro todo item')
      expect(id).toMatch(UUID_V4_REGEX)
    })
  })
})
