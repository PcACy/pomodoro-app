import { beforeEach, describe, expect, it, vi } from 'vitest'

type Store = Map<string, string>
const store: Store = new Map()

vi.stubGlobal('localStorage', {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    store.set(key, value)
  },
  removeItem: (key: string): void => {
    store.delete(key)
  },
})

import { commitQueue, drainQueue, enqueue, hasPendingOps, markFailed, peekQueue } from './syncQueue'
import type { SyncOp } from './syncQueue'

const upsert = (table: 'sessions' | 'todos' | 'tags' | 'settings', id: string): SyncOp => ({ kind: 'upsert', table, id })
const del = (table: 'sessions' | 'todos' | 'tags' | 'settings', id: string): SyncOp => ({ kind: 'delete', table, id })

describe('syncQueue', () => {
  beforeEach(() => store.clear())

  it('deduplicates ops for the same table+id, last one wins', () => {
    enqueue(upsert('todos', 'a'))
    enqueue(upsert('todos', 'b'))
    enqueue(del('todos', 'a'))
    expect(drainQueue()).toEqual([upsert('todos', 'b'), del('todos', 'a')])
  })

  it('supports tag queueing and deduplication', () => {
    enqueue(upsert('tags', 'Work'))
    enqueue(upsert('tags', 'Personal'))
    enqueue(del('tags', 'Work'))
    expect(drainQueue()).toEqual([upsert('tags', 'Personal'), del('tags', 'Work')])
  })

  it('supports settings queueing and replace', () => {
    enqueue(upsert('settings', 'settings'))
    enqueue({ kind: 'replace', table: 'settings' })
    expect(drainQueue()).toEqual([{ kind: 'replace', table: 'settings' }])
  })

  it('replace supersedes all prior ops of the same table only', () => {
    enqueue(upsert('todos', 'a'))
    enqueue(upsert('sessions', 's1'))
    enqueue({ kind: 'replace', table: 'todos' })
    const ops = drainQueue()
    expect(ops).toEqual([upsert('sessions', 's1'), { kind: 'replace', table: 'todos' }])
  })

  it('drainQueue empties the queue and hasPendingOps reflects it', () => {
    expect(hasPendingOps()).toBe(false)
    enqueue(del('sessions', 's9'))
    expect(hasPendingOps()).toBe(true)
    expect(drainQueue()).toEqual([del('sessions', 's9')])
    expect(hasPendingOps()).toBe(false)
  })

  it('survives corrupt persisted queues', () => {
    store.set('pomodoro.sync.queue', '{not-json')
    expect(drainQueue()).toEqual([])
    store.set('pomodoro.sync.queue', JSON.stringify({ nope: true }))
    expect(hasPendingOps()).toBe(false)
  })

  it('peekQueue inspects without clearing and commitQueue removes only completed ops', () => {
    enqueue(upsert('todos', 't1'))
    enqueue(upsert('sessions', 's1'))
    expect(peekQueue()).toEqual([upsert('todos', 't1'), upsert('sessions', 's1')])
    expect(hasPendingOps()).toBe(true)

    // Commit only todos
    commitQueue([upsert('todos', 't1')])
    expect(peekQueue()).toEqual([upsert('sessions', 's1')])

    // Commit sessions
    commitQueue([upsert('sessions', 's1')])
    expect(peekQueue()).toEqual([])
    expect(hasPendingOps()).toBe(false)
  })

  it('markFailed increments attempts on matching ops and drops poison ops', () => {
    enqueue(upsert('todos', 't1'))
    enqueue(upsert('todos', 't2'))

    markFailed([upsert('todos', 't1')])
    expect(peekQueue()).toEqual([
      { ...upsert('todos', 't1'), attempts: 1 },
      upsert('todos', 't2'),
    ])

    // Fail t1 up to limit
    for (let i = 0; i < 5; i++) {
      markFailed([upsert('todos', 't1')])
    }
    // t1 dropped, t2 remains
    expect(peekQueue()).toEqual([upsert('todos', 't2')])
  })
})
