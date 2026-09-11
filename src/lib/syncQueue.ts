type SyncTable = 'sessions' | 'todos'

export type SyncOp =
  | { kind: 'upsert'; table: SyncTable; id: string; attempts?: number }
  | { kind: 'delete'; table: SyncTable; id: string; attempts?: number }
  | { kind: 'replace'; table: SyncTable; attempts?: number }

const STORAGE_KEY = 'pomodoro.sync.queue'

/**
 * Ops that fail this often are dropped instead of retried forever: a
 * permanently failing op (e.g. rejected by validation/RLS) would otherwise
 * block the whole queue and hammer the backend on every backoff cycle.
 */
const MAX_ATTEMPTS = 5

let memoryCache: SyncOp[] | null = null
let lastRawString: string | null = null

function isValidSyncOp(op: unknown): op is SyncOp {
  if (!op || typeof op !== 'object') return false
  const o = op as Record<string, unknown>
  if (o.table !== 'sessions' && o.table !== 'todos') return false
  if (o.kind === 'replace') return true
  if (o.kind === 'upsert' || o.kind === 'delete') {
    return typeof o.id === 'string' && o.id.length > 0 && o.id.length <= 128
  }
  return false
}

function read(): SyncOp[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) {
      memoryCache = []
      lastRawString = null
      return memoryCache
    }
    // Fast path: if raw string hasn't changed since last read/write, return memoryCache
    if (memoryCache !== null && raw === lastRawString) {
      return memoryCache
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      memoryCache = []
      lastRawString = raw
      return memoryCache
    }
    memoryCache = parsed.filter(isValidSyncOp)
    lastRawString = raw
    return memoryCache
  } catch {
    memoryCache = []
    lastRawString = null
    return memoryCache
  }
}

function write(ops: SyncOp[]): void {
  memoryCache = ops
  try {
    if (typeof localStorage === 'undefined') return
    if (ops.length === 0) {
      lastRawString = null
      localStorage.removeItem(STORAGE_KEY)
    } else {
      const json = JSON.stringify(ops)
      lastRawString = json
      localStorage.setItem(STORAGE_KEY, json)
    }
  } catch {
    /* storage unavailable */
  }
}

/** Insert an op; a later op for the same table+id supersedes the earlier one. */
export function enqueue(op: SyncOp): void {
  const ops = read()
  if (op.kind === 'replace') {
    write([...ops.filter((o) => o.table !== op.table), op])
    return
  }
  const filtered = ops.filter(
    (o) => !('id' in o && 'id' in op && o.table === op.table && o.id === op.id),
  )
  write([...filtered, op])
}

const opKey = (op: SyncOp): string =>
  op.kind === 'replace' ? `${op.table}:*` : `${op.table}:${op.id}`

/**
 * Re-enqueue ops that failed to push, without clobbering newer ops that were
 * enqueued while the failed sync was in flight. Existing queue entries win:
 * e.g. a `delete` recorded mid-sync must not be resurrected by re-adding the
 * stale `upsert` from the drained batch. Each requeue counts an attempt; ops
 * past MAX_ATTEMPTS are dropped with a warning instead of retried forever.
 */
export function requeue(ops: SyncOp[]): void {
  if (ops.length === 0) return
  const current = read()
  const keys = new Set(current.map(opKey))
  const merged = [...current]
  for (let i = ops.length - 1; i >= 0; i--) {
    const key = opKey(ops[i])
    if (!keys.has(key)) {
      const attempts = (ops[i].attempts ?? 0) + 1
      if (attempts > MAX_ATTEMPTS) {
        console.warn('[sync] dropping persistently failing op:', ops[i])
        continue
      }
      merged.unshift({ ...ops[i], attempts })
      keys.add(key)
    }
  }
  write(merged)
}

/** Inspect current pending queue items without removing them from storage. */
export function peekQueue(): SyncOp[] {
  return read()
}

/**
 * Remove successfully processed operations from the queue in storage.
 * If newer operations were enqueued for other tables/keys while in flight,
 * they are preserved.
 */
export function commitQueue(completedOps: SyncOp[]): void {
  if (completedOps.length === 0) return
  const completedKeys = new Set(completedOps.map(opKey))
  const current = read()
  const remaining = current.filter((op) => !completedKeys.has(opKey(op)))
  write(remaining)
}

/**
 * Mark operations as failed by incrementing their attempt count.
 * Ops past MAX_ATTEMPTS are dropped to prevent poison queue blocking.
 */
export function markFailed(failedOps: SyncOp[]): void {
  if (failedOps.length === 0) return
  const failedMap = new Map<string, SyncOp>(failedOps.map((op) => [opKey(op), op]))
  const current = read()
  const updated: SyncOp[] = []
  for (const op of current) {
    const key = opKey(op)
    if (failedMap.has(key)) {
      const attempts = (op.attempts ?? 0) + 1
      if (attempts > MAX_ATTEMPTS) {
        console.warn('[sync] dropping persistently failing op:', op)
        continue
      }
      updated.push({ ...op, attempts })
    } else {
      updated.push(op)
    }
  }
  write(updated)
}

/** Atomically take the whole queue (or a slice) for processing. */
export function drainQueue(): SyncOp[] {
  const ops = read()
  write([])
  return ops
}

export function hasPendingOps(): boolean {
  return read().length > 0
}