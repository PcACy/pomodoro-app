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

import { commitQueue, drainQueue, enqueue, hasPendingOps, markFailed, peekQueue, requeue } from './syncQueue'
import type { SyncOp } from './syncQueue'

const upsert = (table: 'sessions' | 'todos', id: string): SyncOp => ({ kind: 'upsert', table, id })
const del = (table: 'sessions' | 'todos', id: string): SyncOp => ({ kind: 'delete', table, id })

describe('syncQueue', () => {
  beforeEach(() => store.clear())

  it('deduplicates ops for the same table+id, last one wins', () => {
    enqueue(upsert('todos', 'a'))
    enqueue(upsert('todos', 'b'))
    enqueue(del('todos', 'a'))
    expect(drainQueue()).toEqual([upsert('todos', 'b'), del('todos', 'a')])
  })

  it('replace supersedes all prior ops of the same table only', () => {
    enqueue(upsert('todos', 'a'))
    enqueue(upsert('sessions', 's1'))
    enqueue({ kind: 'replace', table: 'todos' })
    const ops = drainQueue()
    expect(ops).toEqual([upsert('sessions', 's1'), { kind: 'replace', table: 'todos' }])
  })

  it('requeue keeps newer ops recorded while a sync was in flight (no resurrection)', () => {
    // Sync drains the queue…
    const inFlight: SyncOp[] = drainQueue()
    enqueue(upsert('todos', 'x'))
    expect(inFlight).toEqual([])
    enqueue(upsert('todos', 'x'))
    const batch = drainQueue()
    expect(batch).toEqual([upsert('todos', 'x')])
    // …then the user deletes the todo while the network request hangs.
    enqueue(del('todos', 'x'))
    // The push fails and the stale batch is re-queued.
    requeue(batch)
    // The stale upsert must NOT clobber the newer delete.
    expect(drainQueue()).toEqual([del('todos', 'x')])
  })

  it('requeue restores failed ops in original order before unrelated newer ops', () => {
    const batch = [upsert('todos', 'a'), upsert('todos', 'b')]
    drainQueue()
    enqueue(upsert('sessions', 's1'))
    requeue(batch)
    // Requeued ops carry an attempt counter for poison-op protection.
    expect(drainQueue()).toEqual([
      { ...upsert('todos', 'a'), attempts: 1 },
      { ...upsert('todos', 'b'), attempts: 1 },
      upsert('sessions', 's1'),
    ])
  })

  it('requeue drops ops that fail persistently instead of retrying forever', () => {
    enqueue(upsert('todos', 'a'))
    for (let i = 0; i < 6; i++) {
      const batch = drainQueue()
      if (batch.length === 0) break
      requeue(batch)
    }
    // After 5 failed attempts the op is dropped from the queue.
    expect(drainQueue()).toEqual([])
    expect(hasPendingOps()).toBe(false)
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
