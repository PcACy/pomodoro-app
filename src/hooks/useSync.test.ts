import { describe, expect, it } from 'vitest'
import {
  computeMergedSessionsList,
  deduplicateByConflict,
  formatSyncError,
  isTableMissingError,
  mergeRemoteTagsList,
  mergeRemoteTodosList,
  preferNewerTodo,
  sessionToRow,
  tagRowId,
  todoToRow,
} from './useSync'
import { mergeWithDefaults } from './useSettings'
import type { SyncOp } from '../lib/syncQueue'
import type { Session, TodoItem } from '../types'

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

  describe('mergeRemoteTodosList & preferNewerTodo', () => {
    const baseTodo: TodoItem = {
      id: 't-1',
      title: 'Task 1',
      tag: 'Work',
      done: false,
      pomodoros: 0,
      createdAt: 1000,
      updatedAt: 1000,
    }

    describe('preferNewerTodo', () => {
      it('selects the todo with higher updatedAt timestamp', () => {
        const older = { ...baseTodo, updatedAt: 1000 }
        const newer = { ...baseTodo, title: 'Updated Task', updatedAt: 2000 }
        expect(preferNewerTodo(older, newer)).toBe(newer)
        expect(preferNewerTodo(newer, older)).toBe(newer)
      })

      it('falls back to completedAt or createdAt if updatedAt is absent', () => {
        const a: TodoItem = { id: 't-1', title: 'A', tag: '', done: false, pomodoros: 0, createdAt: 1000 }
        const b: TodoItem = { id: 't-1', title: 'B', tag: '', done: true, pomodoros: 1, createdAt: 500, completedAt: 1500 }
        expect(preferNewerTodo(a, b)).toBe(b)
      })
    })

    describe('mergeRemoteTodosList', () => {
      it('removes local todos that were deleted remotely when they were previously synced', () => {
        const local = [
          { ...baseTodo, id: 't-1' },
          { ...baseTodo, id: 't-2' },
        ]
        const remote = [{ ...baseTodo, id: 't-1' }]
        const syncedIds = new Set(['t-1', 't-2'])

        const merged = mergeRemoteTodosList(local, remote, [], syncedIds)
        expect(merged.map((t) => t.id)).toEqual(['t-1'])
      })

      it('preserves local todos that were not yet synced to remote', () => {
        const local = [
          { ...baseTodo, id: 't-1' },
          { ...baseTodo, id: 't-local-new' },
        ]
        const remote = [{ ...baseTodo, id: 't-1' }]
        const syncedIds = new Set(['t-1'])

        const merged = mergeRemoteTodosList(local, remote, [], syncedIds)
        expect(merged.map((t) => t.id)).toEqual(['t-1', 't-local-new'])
      })

      it('never drops local todos when remote is empty', () => {
        const local = [
          { ...baseTodo, id: 't-1' },
          { ...baseTodo, id: 't-2' },
        ]
        const merged = mergeRemoteTodosList(local, [], [])
        expect(merged.map((t) => t.id)).toEqual(['t-1', 't-2'])
      })

      it('retains pending local upserts even when absent from remote', () => {
        const local = [
          { ...baseTodo, id: 't-1' },
          { ...baseTodo, id: 't-new' },
        ]
        const remote = [{ ...baseTodo, id: 't-1' }]
        const pendingOps: SyncOp[] = [{ kind: 'upsert', table: 'todos', id: 't-new' }]

        const merged = mergeRemoteTodosList(local, remote, pendingOps)
        expect(merged.map((t) => t.id)).toEqual(['t-1', 't-new'])
      })

      it('honors pending local deletes even if remote still returns the todo', () => {
        const local = [{ ...baseTodo, id: 't-1' }]
        const remote = [
          { ...baseTodo, id: 't-1' },
          { ...baseTodo, id: 't-2' },
        ]
        const pendingOps: SyncOp[] = [{ kind: 'delete', table: 'todos', id: 't-2' }]

        const merged = mergeRemoteTodosList(local, remote, pendingOps)
        expect(merged.map((t) => t.id)).toEqual(['t-1'])
      })

      it('adds new remote todos from other devices', () => {
        const local = [{ ...baseTodo, id: 't-1' }]
        const remote = [
          { ...baseTodo, id: 't-1' },
          { ...baseTodo, id: 't-remote' },
        ]

        const merged = mergeRemoteTodosList(local, remote, [])
        expect(merged.map((t) => t.id)).toEqual(['t-1', 't-remote'])
      })

      it('resolves conflicting edits by preferring the newer version', () => {
        const local = [{ ...baseTodo, id: 't-1', title: 'Local Version', updatedAt: 2000 }]
        const remote = [{ ...baseTodo, id: 't-1', title: 'Remote Version', updatedAt: 3000 }]

        const merged = mergeRemoteTodosList(local, remote, [])
        expect(merged[0].title).toBe('Remote Version')
      })
    })
  })

  describe('computeMergedSessionsList', () => {
    const baseSession: Session = {
      id: 'sess-1',
      start: 1000,
      end: 25000,
      durationMs: 24000,
      task: 'Coding',
      tag: 'Work',
      mode: 'pomodoro',
      updatedAt: 25000,
    }

    it('adds new remote sessions not yet present locally', () => {
      const local: Session[] = []
      const remote = [baseSession]
      const { toUpsert, toDelete } = computeMergedSessionsList(local, remote, [])
      expect(toUpsert).toEqual([baseSession])
      expect(toDelete).toEqual([])
    })

    it('preserves local sessions that are absent from remote (non-destructive sync)', () => {
      const local = [
        { ...baseSession, id: 'sess-1' },
        { ...baseSession, id: 'sess-local-only' },
      ]
      const remote = [{ ...baseSession, id: 'sess-1' }]
      const { toUpsert, toDelete } = computeMergedSessionsList(local, remote, [])
      expect(toDelete).toEqual([])
      expect(toUpsert).toEqual([])
    })

    it('preserves local sessions absent from remote if pending local upsert exists', () => {
      const local = [
        { ...baseSession, id: 'sess-1' },
        { ...baseSession, id: 'sess-offline' },
      ]
      const remote = [{ ...baseSession, id: 'sess-1' }]
      const pendingOps: SyncOp[] = [{ kind: 'upsert', table: 'sessions', id: 'sess-offline' }]
      const { toUpsert, toDelete } = computeMergedSessionsList(local, remote, pendingOps)
      expect(toDelete).toEqual([])
      expect(toUpsert).toEqual([])
    })

    it('updates local sessions when remote version is newer', () => {
      const local = [{ ...baseSession, id: 'sess-1', updatedAt: 1000, notes: 'draft' }]
      const remote = [{ ...baseSession, id: 'sess-1', updatedAt: 2000, notes: 'final notes' }]
      const { toUpsert, toDelete } = computeMergedSessionsList(local, remote, [])
      expect(toUpsert).toEqual([remote[0]])
      expect(toDelete).toEqual([])
    })

    it('fills remote notes when timestamps are equal and local has no notes', () => {
      const local = [{ ...baseSession, id: 'sess-1', updatedAt: 1000, notes: undefined }]
      const remote = [{ ...baseSession, id: 'sess-1', updatedAt: 1000, notes: 'synced note' }]
      const { toUpsert, toDelete } = computeMergedSessionsList(local, remote, [])
      expect(toUpsert).toEqual([{ ...local[0], notes: 'synced note' }])
      expect(toDelete).toEqual([])
    })

    it('returns empty operations when local device has a pending replace op', () => {
      const local = [{ ...baseSession, id: 'sess-1' }]
      const remote = [{ ...baseSession, id: 'sess-2' }]
      const pendingOps: SyncOp[] = [{ kind: 'replace', table: 'sessions' }]
      const { toUpsert, toDelete } = computeMergedSessionsList(local, remote, pendingOps)
      expect(toUpsert).toEqual([])
      expect(toDelete).toEqual([])
    })
  })

  describe('deduplicateByConflict', () => {
    it('removes duplicate entries by conflict key and keeps the latest entry', () => {
      const rows = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
        { id: '1', name: 'First Updated' },
      ]
      const deduped = deduplicateByConflict(rows, 'id')
      expect(deduped).toEqual([
        { id: '1', name: 'First Updated' },
        { id: '2', name: 'Second' },
      ])
    })

    it('works with user_id key for settings', () => {
      const rows = [
        { user_id: 'user-1', value: 10 },
        { user_id: 'user-1', value: 20 },
      ]
      const deduped = deduplicateByConflict(rows, 'user_id')
      expect(deduped).toEqual([{ user_id: 'user-1', value: 20 }])
    })
  })

  describe('sessionToRow & todoToRow serialization safeguards', () => {
    it('converts non-UUID session ids into valid RFC-4122 deterministic UUIDs', () => {
      const row = sessionToRow(
        {
          id: 'non-uuid-legacy-id',
          start: 1000,
          end: 25000,
          durationMs: 24000,
          task: 'Testing',
          tag: 'Work',
          mode: 'pomodoro',
        },
        'user-abc',
      )
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(UUID_REGEX.test(row.id)).toBe(true)
      expect(row.user_id).toBe('user-abc')
      expect(row.task).toBe('Testing')
      expect(row.mode).toBe('pomodoro')
    })

    it('sanitizes todo rows ensuring valid values for DB constraints', () => {
      const row = todoToRow(
        {
          id: 'todo-1',
          title: 'Clean code',
          tag: 'Dev',
          done: false,
          pomodoros: -5,
          createdAt: 0,
        },
        'user-abc',
      )
      expect(row.pomodoros).toBe(0) // non-negative check
      expect(row.created_at).toBeGreaterThan(0) // positive check
      expect(row.user_id).toBe('user-abc')
      expect(row.title).toBe('Clean code')
    })
  })

  describe('formatSyncError', () => {
    it('formats error objects with code, message, and details', () => {
      expect(
        formatSyncError({
          code: '42501',
          message: 'new row violates row-level security policy',
          details: 'Failing row contains (xyz)',
        }),
      ).toBe('[42501] new row violates row-level security policy (Failing row contains (xyz))')
    })

    it('formats string errors directly', () => {
      expect(formatSyncError('Network timeout')).toBe('Network timeout')
    })

    it('handles null/undefined gracefully', () => {
      expect(formatSyncError(null)).toBe('Unbekannter Fehler')
      expect(formatSyncError(undefined)).toBe('Unbekannter Fehler')
    })
  })
})

