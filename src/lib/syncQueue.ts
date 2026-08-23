export type SyncTable = 'sessions' | 'todos'

export type SyncOp =
  | { kind: 'upsert'; table: SyncTable; id: string }
  | { kind: 'delete'; table: SyncTable; id: string }
  | { kind: 'replace'; table: SyncTable }

const STORAGE_KEY = 'pomodoro.sync.queue'

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
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidSyncOp)
  } catch {
    return []
  }
}

function write(ops: SyncOp[]): void {
  try {
    if (ops.length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(ops))
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
 * stale `upsert` from the drained batch.
 */
export function requeue(ops: SyncOp[]): void {
  if (ops.length === 0) return
  const current = read()
  const keys = new Set(current.map(opKey))
  const merged = [...current]
  for (let i = ops.length - 1; i >= 0; i--) {
    const key = opKey(ops[i])
    if (!keys.has(key)) {
      merged.unshift(ops[i])
      keys.add(key)
    }
  }
  write(merged)
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