import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { PomodoroDB, sanitizeImportedSession } from './db'
import { sanitizeTodoItem } from './localTodos'

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

  it('validates and preserves valid mode values', () => {
    const pomodoro = sanitizeImportedSession({ start: 1000, mode: 'pomodoro' })
    expect(pomodoro?.mode).toBe('pomodoro')

    const flow = sanitizeImportedSession({ start: 1000, mode: 'flow' })
    expect(flow?.mode).toBe('flow')

    const invalid = sanitizeImportedSession({ start: 1000, mode: 'malicious' })
    expect(invalid?.mode).toBeUndefined()
  })
})

describe('sanitizeTodoItem', () => {
  it('returns null for invalid todos missing id or title', () => {
    expect(sanitizeTodoItem(null)).toBeNull()
    expect(sanitizeTodoItem({})).toBeNull()
    expect(sanitizeTodoItem({ id: 't1', title: '   ' })).toBeNull()
    expect(sanitizeTodoItem({ title: 'Task' })).toBeNull()
  })

  it('sanitizes valid todo items and clamps fields safely', () => {
    const valid = sanitizeTodoItem({
      id: 'todo-123',
      title: 'Valid Task',
      tag: 'Work',
      done: true,
      pomodoros: 4.8,
      createdAt: 1700000000000,
      completedAt: 1700001500000,
    })

    expect(valid).not.toBeNull()
    expect(valid?.id).toBe('todo-123')
    expect(valid?.title).toBe('Valid Task')
    expect(valid?.pomodoros).toBe(4) // floor integer
    expect(valid?.done).toBe(true)
    expect(valid?.completedAt).toBe(1700001500000)
  })
})

describe('PomodoroDB primary key migration', () => {
  it('migrates legacy v1 database (++id autoIncrement) smoothly without UpgradeError', async () => {
    const dbName = 'test-legacy-v1-migration'

    // Step 1: Create a legacy database at version 1 with auto-increment ++id
    const legacyDb = new Dexie(dbName)
    legacyDb.version(1).stores({
      sessions: '++id, start, end, tag, task',
    })
    await legacyDb.open()
    await legacyDb.table('sessions').bulkAdd([
      { start: 1700000000000, end: 1700001500000, tag: 'Work', task: 'Legacy task 1' },
      { start: 1700002000000, end: 1700003500000, tag: 'Study', task: 'Legacy task 2' },
    ])
    legacyDb.close()

    // Step 2: Open using PomodoroDB (which has primary key 'id')
    const modernDb = new PomodoroDB(dbName)
    const items = await modernDb.sessions.toArray()

    // Step 3: Verify migration succeeded without throwing UpgradeError and data was preserved
    expect(items.length).toBe(2)
    const task1 = items.find((i) => i.task === 'Legacy task 1')
    const task2 = items.find((i) => i.task === 'Legacy task 2')
    expect(task1).toBeDefined()
    expect(task1?.tag).toBe('Work')
    expect(task1?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(task2).toBeDefined()
    expect(task2?.tag).toBe('Study')
    expect(task2?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

    modernDb.close()
  })

  it('handles concurrent queries on unopened legacy database without race conditions', async () => {
    const dbName = 'test-concurrent-legacy'

    const legacyDb = new Dexie(dbName)
    legacyDb.version(1).stores({
      sessions: '++id, start, end, tag, task',
    })
    await legacyDb.open()
    await legacyDb.table('sessions').add({
      start: 1700000000000,
      end: 1700001500000,
      tag: 'Concurrent',
      task: 'Task',
    })
    legacyDb.close()

    const modernDb = new PomodoroDB(dbName)
    // Run multiple queries simultaneously before open completes
    const [q1, q2, q3] = await Promise.all([
      modernDb.sessions.toArray(),
      modernDb.sessions.count(),
      modernDb.sessions.toArray(),
    ])

    expect(q1.length).toBe(1)
    expect(q2).toBe(1)
    expect(q3.length).toBe(1)
    expect(q1[0].task).toBe('Task')

    modernDb.close()
  })

  it('preserves existing data in an already modern database without wiping', async () => {
    const dbName = 'test-modern-preservation'

    // Create a modern database directly with UUID string id
    const initialDb = new PomodoroDB(dbName)
    await initialDb.open()
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'
    await initialDb.sessions.put({
      id: validUuid,
      start: 1700000000000,
      end: 1700001500000,
      durationMs: 1500000,
      tag: 'Modern',
      task: 'Do not wipe me',
      updatedAt: 1700001500000,
    })
    initialDb.close()

    // Reopen with PomodoroDB instance
    const reopenedDb = new PomodoroDB(dbName)
    const items = await reopenedDb.sessions.toArray()
    expect(items.length).toBe(1)
    expect(items[0].id).toBe(validUuid)
    expect(items[0].task).toBe('Do not wipe me')

    reopenedDb.close()
  })

  it('restores salvaged sessions from localStorage backup if app crashed mid-migration', async () => {
    const dbName = 'test-backup-restore'
    const backupKey = `pomodoro.legacy_sessions_backup.${dbName}`

    const mockBackup = [
      { id: 42, start: 1700000000000, end: 1700001500000, tag: 'Rescue', task: 'Rescued task' },
    ]

    // Simulate localStorage having the backup file
    const ls = typeof localStorage !== 'undefined' ? localStorage : null
    if (ls) {
      ls.setItem(backupKey, JSON.stringify(mockBackup))
    }

    const db = new PomodoroDB(dbName)
    const items = await db.sessions.toArray()

    if (ls) {
      expect(items.length).toBe(1)
      expect(items[0].task).toBe('Rescued task')
      expect(items[0].tag).toBe('Rescue')
      expect(items[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(ls.getItem(backupKey)).toBeNull()
    }

    db.close()
  })
})
