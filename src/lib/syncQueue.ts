export type SyncTable = 'sessions' | 'todos'

export type SyncOp =
  | { kind: 'upsert'; table: SyncTable; id: string }
  | { kind: 'delete'; table: SyncTable; id: string }
  | { kind: 'replace'; table: SyncTable }

const STORAGE_KEY = 'pomodoro.sync.queue'

function read(): SyncOp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as SyncOp[]) : []
    return Array.isArray(parsed) ? parsed : []
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

/** Atomically take the whole queue (or a slice) for processing. */
export function drainQueue(): SyncOp[] {
  const ops = read()
  write([])
  return ops
}

export function hasPendingOps(): boolean {
  return read().length > 0
}