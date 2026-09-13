import { describe, expect, it } from 'vitest'
import { isTableMissingError, mergeRemoteTagsList, tagRowId } from './useSync'
import { mergeWithDefaults } from './useSettings'
import type { SyncOp } from '../lib/syncQueue'

describe('useSync tag synchronization helpers', () => {
  describe('tagRowId', () => {
    it('constructs a deterministic lowercase encoded key with userId prefix', () => {
      const id1 = tagRowId('user-123', 'Coding')
      const id2 = tagRowId('user-123', 'coding')
      const id3 = tagRowId('user-123', '  Coding  ')

      expect(id1).toBe('user-123:coding')
      expect(id2).toBe('user-123:coding')
      expect(id3).toBe('user-123:coding')
    })

    it('properly encodes special characters and spaces', () => {
      expect(tagRowId('user-123', 'Web Dev')).toBe('user-123:web%20dev')
      expect(tagRowId('user-123', 'C++ / C#')).toBe('user-123:c%2B%2B%20%2F%20c%23')
    })

    it('isolates different users with the same tag name', () => {
      const u1 = tagRowId('user-1', 'Focus')
      const u2 = tagRowId('user-2', 'Focus')
      expect(u1).not.toBe(u2)
      expect(u1).toBe('user-1:focus')
      expect(u2).toBe('user-2:focus')
    })
  })

  describe('mergeRemoteTagsList', () => {
    it('merges remote tags preserving local tag order', () => {
      const local = ['Uni', 'Projekt', 'Coding']
      const remote = ['Coding', 'Uni', 'Projekt', 'Work']

      const result = mergeRemoteTagsList(local, remote, [])
      expect(result).toEqual(['Uni', 'Projekt', 'Coding', 'Work'])
    })

    it('reflects remote deletions when no pending local edits exist', () => {
      const local = ['Uni', 'Projekt', 'Coding']
      // Remote device deleted 'Projekt' and added 'Work'
      const remote = ['Uni', 'Coding', 'Work']

      const result = mergeRemoteTagsList(local, remote, [])
      expect(result).toEqual(['Uni', 'Coding', 'Work'])
    })

    it('retains pending local upserts even if not yet in remote', () => {
      const local = ['Uni', 'Coding', 'Gym']
      const remote = ['Uni', 'Coding']
      const pendingOps: SyncOp[] = [{ kind: 'upsert', table: 'tags', id: 'Gym' }]

      const result = mergeRemoteTagsList(local, remote, pendingOps)
      expect(result).toEqual(['Uni', 'Coding', 'Gym'])
    })

    it('honors pending local deletes even if remote still has the tag', () => {
      const local = ['Uni', 'Coding']
      const remote = ['Uni', 'Projekt', 'Coding']
      const pendingOps: SyncOp[] = [{ kind: 'delete', table: 'tags', id: 'Projekt' }]

      const result = mergeRemoteTagsList(local, remote, pendingOps)
      expect(result).toEqual(['Uni', 'Coding'])
    })

    it('normalizes casing and trims whitespace', () => {
      const local = ['Uni', 'Coding']
      const remote = ['  uni  ', 'CODING', 'Work  ']

      const result = mergeRemoteTagsList(local, remote, [])
      expect(result).toEqual(['Uni', 'Coding', 'Work'])
    })

    it('avoids duplicates when pending upsert matches remote', () => {
      const local = ['Uni', 'Coding', 'Gym']
      const remote = ['Uni', 'Coding', 'Gym']
      const pendingOps: SyncOp[] = [{ kind: 'upsert', table: 'tags', id: 'Gym' }]

      const result = mergeRemoteTagsList(local, remote, pendingOps)
      expect(result).toEqual(['Uni', 'Coding', 'Gym'])
    })

    it('falls back to default or local tags if all would be deleted', () => {
      const result = mergeRemoteTagsList([], [], [])
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('settings synchronization helpers', () => {
    it('parses settings with updatedAt correctly', () => {
      const parsed = mergeWithDefaults({
        phases: { focus: 45, shortBreak: 10, longBreak: 20, roundsBeforeLongBreak: 3 },
        dailyGoalMinutes: 180,
        weeklyGoalMinutes: 900,
        updatedAt: 1700000000000,
      })
      expect(parsed.phases.focus).toBe(45)
      expect(parsed.dailyGoalMinutes).toBe(180)
      expect(parsed.weeklyGoalMinutes).toBe(900)
      expect(parsed.updatedAt).toBe(1700000000000)
    })

    it('sanitizes corrupt or negative numbers while preserving valid fields and updatedAt', () => {
      const parsed = mergeWithDefaults({
        phases: { focus: -10, shortBreak: 0, longBreak: 200, roundsBeforeLongBreak: 0 },
        dailyGoalMinutes: -50,
        weeklyGoalMinutes: NaN,
        updatedAt: 1700000000000,
      })
      expect(parsed.phases.focus).toBe(25) // fallback to default
      expect(parsed.phases.shortBreak).toBe(5) // fallback to default
      expect(parsed.phases.longBreak).toBe(180) // capped at max 180
      expect(parsed.phases.roundsBeforeLongBreak).toBe(4) // fallback to default
      expect(parsed.dailyGoalMinutes).toBe(0)
      expect(parsed.weeklyGoalMinutes).toBe(300) // fallback to default
      expect(parsed.updatedAt).toBe(1700000000000)
    })
  })

  describe('isTableMissingError', () => {
    it('detects missing relation error codes and messages', () => {
      expect(isTableMissingError({ code: '42P01' })).toBe(true)
      expect(isTableMissingError({ code: 'PGRST205' })).toBe(true)
      expect(isTableMissingError({ code: 'PGRST200' })).toBe(true)
      expect(isTableMissingError({ code: 'PGRST204' })).toBe(true)
      expect(isTableMissingError({ status: 404 })).toBe(true)
      expect(isTableMissingError({ statusCode: 404 })).toBe(true)
      expect(
        isTableMissingError({ message: "Could not find the public.tags table in the schema cache" }),
      ).toBe(true)
      expect(isTableMissingError({ message: 'relation "public.tags" does not exist' })).toBe(true)
    })

    it('returns false for unrelated errors', () => {
      expect(isTableMissingError(null)).toBe(false)
      expect(isTableMissingError(undefined)).toBe(false)
      expect(isTableMissingError({ code: '23505', message: 'duplicate key value violates unique constraint' })).toBe(false)
      expect(isTableMissingError({ status: 500, message: 'Internal Server Error' })).toBe(false)
    })
  })
})
