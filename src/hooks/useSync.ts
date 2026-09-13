import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Session, type Settings, type TodoItem } from '../types'
import { mergeWithDefaults } from './useSettings'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { db } from '../lib/db'
import { readTodosLocal } from '../lib/localTodos'
import { commitQueue, hasPendingOps, markFailed, peekQueue, type SyncOp } from '../lib/syncQueue'

export type SyncStatus = 'unsupported' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'

interface Options {
  user: User | null
  mergeRemoteTodos: (remote: TodoItem[]) => void
  tags?: string[]
  mergeRemoteTags?: (remote: string[]) => void
  settings?: Settings
  mergeRemoteSettings?: (remote: Partial<Settings>, remoteUpdatedAt: number) => void
}

interface TagRow {
  id: string
  user_id: string
  name: string
  color: string | null
  updated_at: number
}

export const tagRowId = (userId: string, name: string): string =>
  `${userId}:${encodeURIComponent(name.trim().toLowerCase())}`

const tagToRow = (name: string, userId: string): TagRow => ({
  id: tagRowId(userId, name),
  user_id: userId,
  name: name.trim().slice(0, 100),
  color: null,
  updated_at: Date.now(),
})

export function readTagsLocal(): string[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.settings) : null
    if (!raw) return DEFAULT_SETTINGS.tags
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.tags)) {
      const valid = parsed.tags
        .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t: string) => t.slice(0, 50))
      return valid.length > 0 ? valid : DEFAULT_SETTINGS.tags
    }
    return DEFAULT_SETTINGS.tags
  } catch {
    return DEFAULT_SETTINGS.tags
  }
}

export function readSettingsLocal(): Settings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.settings) : null
    if (!raw) return DEFAULT_SETTINGS
    return mergeWithDefaults(JSON.parse(raw))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function isTableMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string; status?: number; statusCode?: number }
  if (e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST200' || e.code === 'PGRST204') {
    return true
  }
  if (e.status === 404 || e.statusCode === 404) {
    return true
  }
  if (typeof e.message === 'string') {
    const msg = e.message.toLowerCase()
    return (
      msg.includes('schema cache') ||
      msg.includes('does not exist') ||
      msg.includes('relation') ||
      msg.includes('not found')
    )
  }
  return false
}

export function mergeRemoteTagsList(
  currentTags: string[],
  remoteTags: string[],
  pendingOps: SyncOp[] = [],
): string[] {
  const tagOps = pendingOps.filter((op) => op.table === 'tags')
  const pendingDeletes = new Set(
    tagOps.filter((op) => op.kind === 'delete').map((op) => op.id.trim().toLowerCase()),
  )
  const pendingUpserts = tagOps
    .filter((op): op is Extract<typeof op, { kind: 'upsert' }> => op.kind === 'upsert')
    .map((op) => op.id.trim())

  const result: string[] = []
  const seen = new Set<string>()

  // 1. Keep local tags that also exist in remote or are pending local addition,
  // preserving the user's local tag order.
  for (const localTag of currentTags) {
    const trimmed = localTag.trim()
    const lower = trimmed.toLowerCase()
    if (!trimmed || pendingDeletes.has(lower)) continue
    const inRemote = remoteTags.some((r) => r.trim().toLowerCase() === lower)
    const inPendingUpsert = pendingUpserts.some((u) => u.toLowerCase() === lower)
    if (inRemote || inPendingUpsert) {
      if (!seen.has(lower)) {
        seen.add(lower)
        result.push(trimmed)
      }
    }
  }

  // 2. Add remote tags from other devices not yet seen locally
  for (const remoteTag of remoteTags) {
    const trimmed = remoteTag.trim()
    const lower = trimmed.toLowerCase()
    if (!trimmed || pendingDeletes.has(lower)) continue
    if (!seen.has(lower)) {
      seen.add(lower)
      result.push(trimmed.slice(0, 50))
    }
  }

  // 3. Add pending upserts not yet seen
  for (const pendingTag of pendingUpserts) {
    const trimmed = pendingTag.trim()
    const lower = trimmed.toLowerCase()
    if (!trimmed || pendingDeletes.has(lower)) continue
    if (!seen.has(lower)) {
      seen.add(lower)
      result.push(trimmed.slice(0, 50))
    }
  }

  return result.length > 0 ? result : (currentTags.length > 0 ? currentTags : DEFAULT_SETTINGS.tags)
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
  mode: string | null
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
  mode: s.mode ?? null,
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
  mode: r.mode === 'flow' || r.mode === 'pomodoro' ? r.mode : undefined,
  updatedAt: r.updated_at,
})

/** Last-write-wins merge key; falls back to `start` for legacy records. */
const sessionTs = (s: Session): number => s.updatedAt ?? s.start

async function mergeSessionsIntoDb(remote: Session[]): Promise<void> {
  if (remote.length === 0) return
  const local = await db.sessions.toArray()
  const localById = new Map(local.map((s) => [s.id, s]))
  const toUpsert: Session[] = []
  for (const r of remote) {
    const l = localById.get(r.id)
    if (!l) {
      toUpsert.push(r)
      continue
    }
    if (sessionTs(r) > sessionTs(l)) {
      toUpsert.push(r)
    } else if (sessionTs(r) === sessionTs(l) && !l.notes && r.notes) {
      // Same timestamp, equal data – keep the local record but fill a remote note.
      toUpsert.push({ ...l, notes: r.notes })
    }
  }
  if (toUpsert.length) {
    await db.transaction('rw', db.sessions, async () => {
      await db.sessions.bulkPut(toUpsert)
    })
  }
}

export function useSync({
  user,
  mergeRemoteTodos,
  tags,
  mergeRemoteTags,
  settings,
  mergeRemoteSettings,
}: Options) {
  const [status, setStatus] = useState<SyncStatus>(isSupabaseConfigured ? 'signed-out' : 'unsupported')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const busyRef = useRef(false)
  const syncAgainRef = useRef(false)
  const userRef = useRef(user)
  const mergeRef = useRef(mergeRemoteTodos)
  const tagsRef = useRef(tags)
  const mergeTagsRef = useRef(mergeRemoteTags)
  const settingsRef = useRef(settings)
  const mergeSettingsRef = useRef(mergeRemoteSettings)
  useEffect(() => {
    userRef.current = user
    mergeRef.current = mergeRemoteTodos
    tagsRef.current = tags
    mergeTagsRef.current = mergeRemoteTags
    settingsRef.current = settings
    mergeSettingsRef.current = mergeRemoteSettings
  })

  const pushQueue = useCallback(async (supabase: SupabaseClient): Promise<boolean> => {
    if (!userRef.current) return true
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false
    }
    const ops = peekQueue()
    if (ops.length === 0) return true
    // Snapshot the user before pushing: a logout/login mid-push must not
    // attribute drained ops to a different account.
    const userId = userRef.current.id
    const ensureSameUser = (): void => {
      if (userRef.current?.id !== userId) throw new Error('[sync] user changed mid-push')
    }
    let cachedLocalTodos: TodoItem[] | null = null
    const getLocalTodos = (): TodoItem[] => {
      if (!cachedLocalTodos) {
        cachedLocalTodos = readTodosLocal()
      }
      return cachedLocalTodos
    }
    // Tables fully pushed before a later failure are committed immediately:
    // upserts/deletes are idempotent, and committing per table ensures that
    // subsequent retry batches only process remaining tables.
    const pushedTables = new Set<string>()
    try {
      for (const table of ['sessions', 'todos', 'tags', 'settings'] as const) {
        ensureSameUser()
        const tOps = ops.filter((o) => o.table === table)
        if (tOps.length === 0) continue
        const replace = tOps.some((o) => o.kind === 'replace')
        const upserts: unknown[] = []
        const deletes: string[] = []

        const nonReplaceOps = tOps.filter((o) => o.kind !== 'replace')
        for (const op of nonReplaceOps) {
          if (op.kind === 'delete') {
            deletes.push(table === 'tags' ? tagRowId(userId, op.id) : op.id)
          }
        }

        const upsertOps = nonReplaceOps.filter(
          (o): o is Extract<typeof o, { kind: 'upsert' }> => o.kind === 'upsert',
        )

        if (upsertOps.length > 0) {
          if (table === 'sessions') {
            const ids = upsertOps.map((o) => o.id)
            const records = await db.sessions.bulkGet(ids)
            for (let i = 0; i < upsertOps.length; i++) {
              const op = upsertOps[i]
              const rec = records[i]
              if (!rec) deletes.push(op.id)
              else upserts.push(sessionToRow(rec, userId))
            }
          } else if (table === 'todos') {
            const localTodos = getLocalTodos()
            const todosMap = new Map(localTodos.map((t) => [t.id, t]))
            for (const op of upsertOps) {
              const rec = todosMap.get(op.id)
              if (!rec) deletes.push(op.id)
              else upserts.push(todoToRow(rec, userId))
            }
          } else if (table === 'tags') {
            const currentTags = tagsRef.current ?? readTagsLocal()
            for (const op of upsertOps) {
              const rec = currentTags.find((t) => t.trim().toLowerCase() === op.id.trim().toLowerCase())
              if (!rec) deletes.push(tagRowId(userId, op.id))
              else upserts.push(tagToRow(rec, userId))
            }
          } else if (table === 'settings') {
            const currentSettings = settingsRef.current ?? readSettingsLocal()
            upserts.push({
              user_id: userId,
              settings: {
                phases: currentSettings.phases,
                dailyGoalMinutes: currentSettings.dailyGoalMinutes,
                weeklyGoalMinutes: currentSettings.weeklyGoalMinutes,
              },
              updated_at: currentSettings.updatedAt ?? Date.now(),
            })
          }
        }

        const dbTable = table === 'settings' ? 'user_settings' : table
        const onConflict = table === 'settings' ? 'user_id' : 'id'

        if (replace) {
          const resDel = await supabase.from(dbTable).delete().eq('user_id', userId)
          if (resDel.error) {
            if (isTableMissingError(resDel.error)) {
              console.warn(`[sync] Table ${dbTable} not found on Supabase. Skipping ${table} replace.`)
              pushedTables.add(table)
              commitQueue(tOps)
              continue
            }
            throw resDel.error
          }
          if (table === 'settings') {
            const currentSettings = settingsRef.current ?? readSettingsLocal()
            const row = {
              user_id: userId,
              settings: {
                phases: currentSettings.phases,
                dailyGoalMinutes: currentSettings.dailyGoalMinutes,
                weeklyGoalMinutes: currentSettings.weeklyGoalMinutes,
              },
              updated_at: currentSettings.updatedAt ?? Date.now(),
            }
            const resUpsert = await supabase.from('user_settings').upsert([row], { onConflict: 'user_id' })
            if (resUpsert.error && !isTableMissingError(resUpsert.error)) throw resUpsert.error
          } else {
            const all =
              table === 'sessions'
                ? await db.sessions.toArray()
                : table === 'todos'
                  ? getLocalTodos()
                  : (tagsRef.current ?? readTagsLocal())
            if (all.length) {
              const rows = all.map((r) => {
                if (table === 'sessions') return sessionToRow(r as Session, userId)
                if (table === 'todos') return todoToRow(r as TodoItem, userId)
                return tagToRow(r as string, userId)
              })
              const resUpsert = await supabase.from(dbTable).upsert(rows, { onConflict: 'id' })
              if (resUpsert.error && !isTableMissingError(resUpsert.error)) throw resUpsert.error
            }
          }
        } else {
          if (upserts.length) {
            const resUpsert = await supabase.from(dbTable).upsert(upserts, { onConflict })
            if (resUpsert.error) {
              if (isTableMissingError(resUpsert.error)) {
                console.warn(`[sync] Table ${dbTable} not found on Supabase. Skipping ${table} push.`)
                pushedTables.add(table)
                commitQueue(tOps)
                continue
              }
              throw resUpsert.error
            }
          }
          if (deletes.length) {
            const uniqueDeletes = Array.from(new Set(deletes))
            const resDel = await supabase.from(dbTable).delete().in('id', uniqueDeletes).eq('user_id', userId)
            if (resDel.error) {
              if (isTableMissingError(resDel.error)) {
                console.warn(`[sync] Table ${dbTable} not found on Supabase. Skipping ${table} delete.`)
                pushedTables.add(table)
                commitQueue(tOps)
                continue
              }
              throw resDel.error
            }
          }
        }
        pushedTables.add(table)
        commitQueue(tOps)
      }
      return true
    } catch (e) {
      console.error('[sync] push failed:', e)
      const failedOps = ops.filter((o) => !pushedTables.has(o.table))
      markFailed(failedOps)
      return false
    }
  }, [])

  const pullAndMerge = useCallback(async (supabase: SupabaseClient): Promise<boolean> => {
    if (!userRef.current) return false
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false
    }
    const userId = userRef.current.id
    try {
      const [sess, todos, tagsRes, userSettingsRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('user_id', userId),
        supabase.from('todos').select('*').eq('user_id', userId),
        supabase.from('tags').select('*').eq('user_id', userId),
        supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      ])
      if (sess.error) throw sess.error
      if (todos.error) throw todos.error
      // The user may have logged out while the pull was in flight: never
      // merge another account's rows into the local store.
      if (userRef.current?.id !== userId) return false
      await mergeSessionsIntoDb((sess.data ?? []).map((r) => rowToSession(r as SessionRow)))
      mergeRef.current((todos.data ?? []).map((r) => rowToTodo(r as TodoRow)))

      if (tagsRes.error) {
        if (isTableMissingError(tagsRes.error)) {
          console.warn('[sync] public.tags table not found on Supabase. Apply schema.sql to enable tag sync.')
        } else {
          throw tagsRes.error
        }
      } else {
        const remoteTags = (tagsRes.data ?? []) as TagRow[]
        if (remoteTags.length === 0) {
          // Initial sync on fresh account: seed remote with existing local tags
          const currentTags = tagsRef.current ?? readTagsLocal()
          if (currentTags.length > 0) {
            const seedRows = currentTags.map((t) => tagToRow(t, userId))
            const seedRes = await supabase.from('tags').upsert(seedRows, { onConflict: 'id' })
            if (seedRes.error && !isTableMissingError(seedRes.error)) throw seedRes.error
          }
        } else {
          mergeTagsRef.current?.(remoteTags.map((r) => r.name))
        }
      }

      if (userSettingsRes.error) {
        if (isTableMissingError(userSettingsRes.error)) {
          console.warn(
            '[sync] public.user_settings table not found on Supabase. Apply schema.sql to enable settings sync.',
          )
        } else {
          throw userSettingsRes.error
        }
      } else {
        const remoteSettingsRow = userSettingsRes.data as {
          user_id: string
          settings: Partial<Settings>
          updated_at: number
        } | null
        if (!remoteSettingsRow) {
          // Initial sync on fresh account: seed remote with existing local settings
          const currentSettings = settingsRef.current ?? readSettingsLocal()
          const seedRes = await supabase.from('user_settings').upsert(
            {
              user_id: userId,
              settings: {
                phases: currentSettings.phases,
                dailyGoalMinutes: currentSettings.dailyGoalMinutes,
                weeklyGoalMinutes: currentSettings.weeklyGoalMinutes,
              },
              updated_at: currentSettings.updatedAt ?? Date.now(),
            },
            { onConflict: 'user_id' },
          )
          if (seedRes.error && !isTableMissingError(seedRes.error)) throw seedRes.error
        } else {
          mergeSettingsRef.current?.(remoteSettingsRow.settings, remoteSettingsRow.updated_at)
        }
      }
      return true
    } catch (e) {
      console.error('[sync] pull failed:', e)
      return false
    }
  }, [])

  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<number | null>(null)

  const sync = useCallback(
    async (showSyncing = false) => {
      if (busyRef.current) {
        syncAgainRef.current = true
        return
      }
      const supabase = await getSupabase()
      if (!supabase || !userRef.current) {
        setStatus(isSupabaseConfigured ? 'signed-out' : 'unsupported')
        return
      }
      if (retryTimeoutRef.current != null) {
        window.clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      busyRef.current = true
      try {
        if (showSyncing) setStatus('syncing')
        const pushed = await pushQueue(supabase)
        let ok = pushed
        if (ok) ok = await pullAndMerge(supabase)
        const stillPending = hasPendingOps()
        setPending(stillPending)
        if (ok) {
          retryCountRef.current = 0
          setLastSyncAt(Date.now())
          setStatus('synced')
        } else {
          const isOnline = typeof navigator === 'undefined' || navigator.onLine
          setStatus(isOnline ? 'error' : 'offline')
          if (typeof window !== 'undefined') {
            const backoffMs = Math.min(30_000, 1000 * Math.pow(2, retryCountRef.current))
            retryCountRef.current = Math.min(retryCountRef.current + 1, 5)
            retryTimeoutRef.current = window.setTimeout(() => {
              void sync(false)
            }, backoffMs)
          }
        }
      } finally {
        busyRef.current = false
        if (syncAgainRef.current) {
          syncAgainRef.current = false
          // Tracked in retryTimeoutRef so unmount clears it (no post-unmount
          // setStatus / sync under a stale user).
          retryTimeoutRef.current = window.setTimeout(() => {
            void sync(false)
          }, 50)
        }
      }
    },
    [pushQueue, pullAndMerge],
  )

  useEffect(() => {
    let disposed = false
    let detach: (() => void) | null = null
    void getSupabase().then((supabase) => {
      if (disposed) return
      if (!supabase) return // unsupported – stay in initial 'unsupported' state
      if (!user) {
        setStatus('signed-out')
        return
      }
      void sync(true)
      const onOnline = () => {
        retryCountRef.current = 0
        void sync(true)
      }
      const onOffline = () => {
        setStatus('offline')
      }
      const onVisible = () => {
        if (document.visibilityState === 'visible') void sync(true)
      }
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
      document.addEventListener('visibilitychange', onVisible)
      detach = () => {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
        document.removeEventListener('visibilitychange', onVisible)
      }
    })
    return () => {
      disposed = true
      detach?.()
      if (retryTimeoutRef.current != null) {
        window.clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [user, sync])

  useEffect(() => {
    // A non-null user implies the client is loaded and a session exists.
    if (!user) return
    const interval = window.setInterval(() => {
      setPending(hasPendingOps())
      void sync(false)
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [user, sync])

  return { status, lastSyncAt, pending, sync }
}