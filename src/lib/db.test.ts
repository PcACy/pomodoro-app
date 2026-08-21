import { describe, expect, it } from 'vitest'
import { sanitizeImportedSession } from './db'

describe('sanitizeImportedSession', () => {
  it('returns null for non-objects or missing start timestamp', () => {
    expect(sanitizeImportedSession(null)).toBeNull()
    expect(sanitizeImportedSession(undefined)).toBeNull()
    expect(sanitizeImportedSession('invalid')).toBeNull()
    expect(sanitizeImportedSession({})).toBeNull()
    expect(sanitizeImportedSession({ start: 'not-a-number' })).toBeNull()
    expect(sanitizeImportedSession({ start: -100 })).toBeNull()
    expect(sanitizeImportedSession({ start: NaN })).toBeNull()
  })

  it('sanitizes valid session objects and assigns deterministic UUID if missing', () => {
    const raw = {
      start: 1700000000000,
      durationMs: 1500000,
      task: 'Refactoring',
      tag: 'Code',
      notes: 'Cleaned up architecture',
    }

    const session = sanitizeImportedSession(raw)
    expect(session).not.toBeNull()
    expect(session?.start).toBe(1700000000000)
    expect(session?.durationMs).toBe(1500000)
    expect(session?.end).toBe(1700001500000)
    expect(session?.task).toBe('Refactoring')
    expect(session?.tag).toBe('Code')
    expect(session?.notes).toBe('Cleaned up architecture')
    expect(session?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)
  })

  it('preserves valid RFC-4122 v4 UUIDs', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'
    const raw = {
      id: validUuid,
      start: 1700000000000,
      end: 1700001500000,
      durationMs: 1500000,
      task: 'Task',
      tag: 'Tag',
    }

    const session = sanitizeImportedSession(raw)
    expect(session?.id).toBe(validUuid)
  })

  it('clamps excessively long strings and handles legacy duration_ms format', () => {
    const raw = {
      start: 1700000000000,
      duration_ms: 1800000,
      task: 'A'.repeat(500),
      tag: 'B'.repeat(100),
      notes: 'C'.repeat(5000),
    }

    const session = sanitizeImportedSession(raw)
    expect(session?.durationMs).toBe(1800000)
    expect(session?.task.length).toBe(200)
    expect(session?.tag.length).toBe(50)
    expect(session?.notes?.length).toBe(2000)
  })
})

