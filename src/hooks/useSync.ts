import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Session, TodoItem } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { db } from '../lib/db'
import { readTodosLocal } from '../lib/localTodos'
import { drainQueue, enqueue, hasPendingOps } from '../lib/syncQueue'

export type SyncStatus = 'unsupported' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'

interface Options {
  user: User | null
  mergeRemoteTodos: (remote: TodoItem[]) => void
}

interface TodoRow extends Omit<TodoItem, 'createdAt' | 'completedAt' | 'updatedAt'> {
  user_id: string
  created_at: number
  completed_at: number | null
  updated_at: number
}

interface SessionRow {
  id: string
  user_id: string
  start: number
  end: number
  duration_ms: number
  task: string
  tag: string
  notes: string | null
  updated_at: number
}

const todoToRow = (t: TodoItem, userId: string): TodoRow => ({
  id: t.id,
  user_id: userId,
  title: t.title,
  tag: t.tag,
  done: t.done,
  pomodoros: t.pomodoros,
  created_at: t.createdAt,
  completed_at: t.completedAt ?? null,
  updated_at: t.updatedAt ?? t.completedAt ?? t.createdAt,
})

const rowToTodo = (r: TodoRow): TodoItem => ({
  id: r.id,
  title: r.title,
  tag: r.tag,
  done: r.done,
  pomodoros: r.pomodoros,
  createdAt: r.created_at,
  completedAt: r.completed_at ?? undefined,
  updatedAt: r.updated_at,
})

const sessionToRow = (s: Session, userId: string): SessionRow => ({
  id: s.id,
  user_id: userId,
  start: s.start,
  end: s.end,
  duration_ms: s.durationMs,
  task: s.task,
  tag: s.tag,
  notes: s.notes ?? null,
  updated_at: s.updatedAt ?? s.start,
})

const rowToSession = (r: SessionRow): Session => ({
  id: r.id,
  start: r.start,
  end: r.end,
  durationMs: r.duration_ms,
  task: r.task,
  tag: r.tag,
  notes: r.notes ?? undefined,
  updatedAt: r.updated_at,
})

/** Last-write-wins merge key; falls back to `start` for legacy records. */
const sessionTs = (s: Session): number => s.updatedAt ?? s.start

async function mergeSessionsIntoDb(remote: Session[]): Promise<void> {
  if (remote.length === 0) return
  const local = await db.sessions.toArray()
  const localById = new Map(local.map((s) => [s.id, s]))
  const toAdd: Session[] = []
  const toPut: Session[] = []
  for (const r of remote) {
    const l = localById.get(r.id)
    if (!l) {
      toAdd.push(r)
      continue
    }
    if (sessionTs(r) > sessionTs(l)) {
      toPut.push(r)
    } else if (sessionTs(r) === sessionTs(l) && !l.notes && r.notes) {
      // Same timestamp, equal data – keep the local record but fill a remote note.
      toPut.push({ ...l, notes: r.notes })
    }
  }
  if (toAdd.length || toPut.length) {
    await db.transaction('rw', db.sessions, async () => {
      if (toAdd.length) await db.sessions.bulkAdd(toAdd)
      if (toPut.length) await db.sessions.bulkPut(toPut)
    })
  }
}

export function useSync({ user, mergeRemoteTodos }: Options) {
  const [status, setStatus] = useState<SyncStatus>(isSupabaseConfigured ? 'signed-out' : 'unsupported')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const busyRef = useRef(false)
  const userRef = useRef(user)
  userRef.current = user
  const mergeRef = useRef(mergeRemoteTodos)
  mergeRef.current = mergeRemoteTodos

  const pushQueue = useCallback(async (): Promise<boolean> => {
    if (!supabase || !userRef.current) return true
    const ops = drainQueue()
    if (ops.length === 0) return true
    const userId = userRef.current.id
    try {
      for (const table of ['sessions', 'todos'] as const) {
        const tOps = ops.filter((o) => o.table === table)
        if (tOps.length === 0) continue
        const replace = tOps.some((o) => o.kind === 'replace')
        const upserts: unknown[] = []
        const deletes: string[] = []
        for (const op of tOps) {
          if (op.kind === 'replace') continue
          if (op.kind === 'delete') {
            deletes.push(op.id)
            continue
          }
          if (table === 'sessions') {
            const rec = await db.sessions.get(op.id)
            if (!rec) deletes.push(op.id)
            else upserts.push(sessionToRow(rec, userId))
          } else {
            const rec = readTodosLocal().find((t) => t.id === op.id)
            if (!rec) deletes.push(op.id)
            else upserts.push(todoToRow(rec, userId))
          }
        }
        if (replace) {
          const resDel = await supabase.from(table).delete().eq('user_id', userId)
          if (resDel.error) throw resDel.error
          const all =
            table === 'sessions'
              ? await db.sessions.toArray()
              : readTodosLocal()
          if (all.length) {
            const rows = all.map((r) =>
              table === 'sessions' ? sessionToRow(r as Session, userId) : todoToRow(r as TodoItem, userId),
            )
            const resUpsert = await supabase.from(table).upsert(rows, { onConflict: 'id' })
            if (resUpsert.error) throw resUpsert.error
          }
        } else {
          if (upserts.length) {
            const resUpsert = await supabase.from(table).upsert(upserts, { onConflict: 'id' })
            if (resUpsert.error) throw resUpsert.error
          }
          if (deletes.length) {
            const resDel = await supabase.from(table).delete().in('id', deletes).eq('user_id', userId)
            if (resDel.error) throw resDel.error
          }
        }
      }
      return true
    } catch (e) {
      console.error('[sync] push failed:', e)
      for (const op of ops) enqueue(op)
      return false
    }
  }, [])

  const pullAndMerge = useCallback(async (): Promise<boolean> => {
    if (!supabase || !userRef.current) return false
    const userId = userRef.current.id
    try {
      const [sess, todos] = await Promise.all([
        supabase.from('sessions').select('*').eq('user_id', userId),
        supabase.from('todos').select('*').eq('user_id', userId),
      ])
      if (sess.error) throw sess.error
      if (todos.error) throw todos.error
      await mergeSessionsIntoDb((sess.data ?? []).map((r) => rowToSession(r as SessionRow)))
      mergeRef.current((todos.data ?? []).map((r) => rowToTodo(r as TodoRow)))
      return true
    } catch (e) {
      console.error('[sync] pull failed:', e)
      return false
    }
  }, [])

  const sync = useCallback(
    async (showSyncing = false) => {
      if (busyRef.current) return
      if (!supabase || !userRef.current) {
        setStatus(isSupabaseConfigured ? 'signed-out' : 'unsupported')
        return
      }
      busyRef.current = true
      if (showSyncing) setStatus('syncing')
      const pushed = await pushQueue()
      let ok = pushed
      if (ok) ok = await pullAndMerge()
      setPending(hasPendingOps())
      if (ok) {
        setLastSyncAt(Date.now())
        setStatus('synced')
      } else {
        setStatus('offline')
      }
      busyRef.current = false
    },
    [pushQueue, pullAndMerge],
  )

  useEffect(() => {
    if (!supabase) return
    if (!user) {
      setStatus('signed-out')
      return
    }
    void sync(true)
    const onOnline = () => void sync(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync(true)
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, sync])

  useEffect(() => {
    if (!user || !supabase) return
    const interval = window.setInterval(() => {
      setPending(hasPendingOps())
      void sync(false)
    }, 45_000)
    return () => window.clearInterval(interval)
  }, [user, sync])

  useEffect(() => {
    if (!user || !supabase) return
    const interval = window.setInterval(() => setPending(hasPendingOps()), 5000)
    return () => window.clearInterval(interval)
  }, [user])

  return { status, lastSyncAt, pending, sync }
}