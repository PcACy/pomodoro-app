import Dexie, { type Table, type PromiseExtended } from 'dexie'
import type { Session, TodoItem } from '../types'
import { uid, uidFrom, UUID_REGEX } from './uid'
import { enqueue } from './syncQueue'
import { readTodosLocal } from './localTodos'

const DB_NAME = 'pomodoro-db'
const LEGACY_BACKUP_KEY = 'pomodoro.legacy_sessions_backup'

const legacyMigrationPromises = new Map<string, Promise<void>>()
const inMemorySalvagedSessions = new Map<string, unknown[]>()

async function readLegacySessionsNative(dbName: string): Promise<unknown[] | null> {
  if (typeof indexedDB === 'undefined') return null

  return new Promise((resolve) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(dbName)
    } catch {
      return resolve(null)
    }

    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
    req.onsuccess = () => {
      const idb = req.result
      try {
        if (!idb.objectStoreNames.contains('sessions')) {
          idb.close()
          return resolve(null)
        }

        const tx = idb.transaction('sessions', 'readonly')
        const store = tx.objectStore('sessions')

        // If autoIncrement is false (modern schema), no legacy migration needed
        if (!store.autoIncrement) {
          idb.close()
          return resolve(null)
        }

        // Legacy auto-increment store detected: read all records
        const getAllReq = store.getAll()
        getAllReq.onsuccess = () => {
          const records = getAllReq.result || []
          idb.close()
          resolve(records)
        }
        getAllReq.onerror = () => {
          idb.close()
          resolve(null)
        }
      } catch {
        try {
          idb.close()
        } catch {
          /* ignore */
        }
        resolve(null)
      }
    }
  })
}

async function deleteDatabaseSafe(dbName: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return

  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve()
      }
    }, 2000)

    try {
      const delReq = indexedDB.deleteDatabase(dbName)
      delReq.onsuccess = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve()
        }
      }
      delReq.onerror = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve()
        }
      }
      delReq.onblocked = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve()
        }
      }
    } catch {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve()
      }
    }
  })
}

export async function checkAndMigrateLegacyDatabase(dbName: string = DB_NAME): Promise<void> {
  if (typeof indexedDB === 'undefined') return

  try {
    const legacyRecords = await readLegacySessionsNative(dbName)
    if (legacyRecords !== null) {
      console.info('[db] Detected legacy autoIncrement database schema. Migrating sessions...', legacyRecords.length)
      inMemorySalvagedSessions.set(dbName, legacyRecords)

      const backupKey = `${LEGACY_BACKUP_KEY}.${dbName}`
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(backupKey, JSON.stringify(legacyRecords))
        }
      } catch (e) {
        console.warn('[db] Failed to write legacy backup to localStorage:', e)
      }

      await deleteDatabaseSafe(dbName)
      console.info('[db] Legacy database dropped cleanly for modern recreation.')
    }
  } catch (err) {
    console.error('[db] Error checking legacy database schema:', err)
  }
}

export function ensureLegacyMigration(dbName: string = DB_NAME): Promise<void> {
  let promise = legacyMigrationPromises.get(dbName)
  if (!promise) {
    promise = checkAndMigrateLegacyDatabase(dbName)
    legacyMigrationPromises.set(dbName, promise)
  }
  return promise
}

export class PomodoroDB extends Dexie {
  sessions!: Table<Session, string>

  constructor(dbName: string = DB_NAME) {
    super(dbName)
    this.version(2)
      .stores({
        sessions: 'id, start, end, tag, task',
      })
      .upgrade(async (tx) => {
        const table = tx.table('sessions')
        const existing = await table.toArray()
        if (existing.length) {
          await table.clear()
          await table.bulkPut(
            existing.map((r) => ({
              ...r,
              id: typeof r.id === 'string' && r.id ? r.id : uid(),
            })),
          )
        }
      })
    this.version(3)
      .stores({
        sessions: 'id, start, end, tag, task',
      })
      .upgrade(async (tx) => {
        const table = tx.table('sessions')
        const existing = await table.toArray()
        if (existing.length) {
          const updated = existing.map((r) => ({
            ...r,
            id: typeof r.id === 'string' && UUID_REGEX.test(r.id) ? r.id : uidFrom(String(r.id)),
          }))
          await table.clear()
          await table.bulkPut(updated)
        }
      })

    this.on('ready', async () => {
      await this.restoreSalvagedSessions()
    })
  }

  private async restoreSalvagedSessions(): Promise<void> {
    let toRestore = inMemorySalvagedSessions.get(this.name)
    inMemorySalvagedSessions.delete(this.name)

    const backupKey = `${LEGACY_BACKUP_KEY}.${this.name}`
    if (!toRestore || toRestore.length === 0) {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(backupKey) ?? localStorage.getItem(LEGACY_BACKUP_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length > 0) {
              toRestore = parsed
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (toRestore && toRestore.length > 0) {
      console.info('[db] Restoring salvaged sessions into modern database:', toRestore.length)
      const cleaned: Session[] = []
      for (const item of toRestore) {
        const valid = sanitizeImportedSession(item)
        if (valid) {
          cleaned.push(valid)
        }
      }

      if (cleaned.length > 0) {
        await this.sessions.bulkPut(cleaned)
        enqueue({ kind: 'replace', table: 'sessions' })
      }

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(backupKey)
          localStorage.removeItem(LEGACY_BACKUP_KEY)
        }
      } catch {
        /* ignore */
      }
    }
  }

  override open(): PromiseExtended<Dexie> {
    return Dexie.Promise.resolve()
      .then(() => ensureLegacyMigration(this.name))
      .then(() => super.open())
      .catch(async (err: unknown) => {
        const isUpgradeError =
          err instanceof Error &&
          (err.name === 'UpgradeError' ||
            err.message?.includes('primary key') ||
            err.message?.includes('Upgrade'))

        if (isUpgradeError) {
          console.warn('[db] UpgradeError caught during open. Performing emergency schema reset...', err)
          this.close()
          await deleteDatabaseSafe(this.name)
          return super.open()
        }
        throw err
      }) as PromiseExtended<Dexie>
  }
}

export const db = new PomodoroDB()

export async function addSession(session: Omit<Session, 'id'>): Promise<string> {
  // Guard against duplicate insertions from concurrent tabs or background races
  // that finish the exact same focus session (matching start and matching end within 2 sec).
  const existing = await db.sessions
    .where('start')
    .equals(session.start)
    .filter((s) => Math.abs(s.end - session.end) <= 2000)
    .first()
  if (existing) {
    return existing.id
  }

  const id = uid()
  const now = Date.now()
  const record: Session = { ...session, id, updatedAt: now }
  await db.sessions.put(record)
  enqueue({ kind: 'upsert', table: 'sessions', id })
  return id
}

export async function updateSessionNotes(id: string, notes: string): Promise<void> {
  await db.sessions.update(id, { notes, updatedAt: Date.now() })
  enqueue({ kind: 'upsert', table: 'sessions', id })
}

export async function clearSessions(): Promise<void> {
  await db.sessions.clear()
  enqueue({ kind: 'replace', table: 'sessions' })
}

export function sanitizeImportedSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const start = typeof s.start === 'number' && Number.isFinite(s.start) && s.start > 0 ? s.start : null
  if (start == null) return null

  const durationMs =
    typeof s.durationMs === 'number' && Number.isFinite(s.durationMs) && s.durationMs > 0
      ? s.durationMs
      : typeof s.duration_ms === 'number' && Number.isFinite(s.duration_ms) && s.duration_ms > 0
        ? s.duration_ms
        : typeof s.end === 'number' && Number.isFinite(s.end) && s.end > start
          ? s.end - start
          : 1500_000

  const end =
    typeof s.end === 'number' && Number.isFinite(s.end) && s.end >= start
      ? s.end
      : start + durationMs

  const task = typeof s.task === 'string' ? s.task.slice(0, 200) : ''
  const tag = typeof s.tag === 'string' && s.tag ? s.tag.slice(0, 50) : 'Unsorted'
  const notes = typeof s.notes === 'string' && s.notes.trim() ? s.notes.slice(0, 2000) : undefined

  const rawId = typeof s.id === 'string' ? s.id : typeof s.id === 'number' ? String(s.id) : ''
  // Content-derived IDs would collapse legitimately distinct rows that share
  // start/duration/task/tag (e.g. two identical untagged blocks): since
  // importSessions clears the table first, idempotency across imports is moot
  // and uniqueness wins — mint a fresh id for every non-UUID row.
  const id = UUID_REGEX.test(rawId) ? rawId : uid()
  const updatedAt =
    typeof s.updatedAt === 'number' && Number.isFinite(s.updatedAt)
      ? s.updatedAt
      : typeof s.updated_at === 'number' && Number.isFinite(s.updated_at)
        ? s.updated_at
        : Date.now()
  const mode = s.mode === 'flow' || s.mode === 'pomodoro' ? s.mode : undefined

  return { id, start, end, durationMs, task, tag, notes, mode, updatedAt }
}

export async function importSessions(sessions: unknown[]): Promise<void> {
  if (!Array.isArray(sessions)) return
  const cleaned: Session[] = []
  for (const item of sessions) {
    const valid = sanitizeImportedSession(item)
    if (valid) cleaned.push(valid)
  }
  await db.transaction('rw', db.sessions, async () => {
    await db.sessions.clear()
    if (cleaned.length) await db.sessions.bulkPut(cleaned)
  })
  enqueue({ kind: 'replace', table: 'sessions' })
}

export async function exportAll(): Promise<{ settings: unknown; sessions: Session[]; todos: TodoItem[] }> {
  const sessions = await db.sessions.orderBy('start').toArray()
  let settings: unknown = null
  try {
    const raw = localStorage.getItem('pomodoro.settings')
    if (raw) settings = JSON.parse(raw)
  } catch {
    /* fallback to null */
  }
  const todos = readTodosLocal()
  return { settings, sessions, todos }
}