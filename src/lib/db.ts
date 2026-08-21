import Dexie, { type Table } from 'dexie'
import type { Session } from '../types'
import { uid, uidFrom } from './uid'
import { enqueue } from './syncQueue'

class PomodoroDB extends Dexie {
  sessions!: Table<Session, string>

  constructor() {
    super('pomodoro-db')
    this.version(2)
      .stores({
        sessions: 'id, start, end, tag, task',
      })
      .upgrade(async (tx) => {
        const table = tx.table('sessions')
        const existing = await table.toArray()
        if (existing.length) {
          await table.clear()
          await table.bulkAdd(existing.map((r) => ({ ...r, id: typeof r.id === 'string' ? r.id : uid() })))
        }
      })
  }
}

export const db = new PomodoroDB()

export async function addSession(session: Omit<Session, 'id'>): Promise<string> {
  const id = uid()
  const now = Date.now()
  const record: Session = { ...session, id, updatedAt: now }
  await db.sessions.add(record)
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
        : 1500_000

  const end =
    typeof s.end === 'number' && Number.isFinite(s.end) && s.end >= start
      ? s.end
      : start + durationMs

  const task = typeof s.task === 'string' ? s.task.slice(0, 200) : ''
  const tag = typeof s.tag === 'string' && s.tag ? s.tag.slice(0, 50) : 'Unsorted'
  const notes = typeof s.notes === 'string' && s.notes.trim() ? s.notes.slice(0, 2000) : undefined

  const rawId = typeof s.id === 'string' ? s.id : ''
  const id = UUID_REGEX.test(rawId) ? rawId : uidFrom(`${start}:${durationMs}:${task}:${tag}`)
  const updatedAt =
    typeof s.updatedAt === 'number' && Number.isFinite(s.updatedAt)
      ? s.updatedAt
      : typeof s.updated_at === 'number' && Number.isFinite(s.updated_at)
        ? s.updated_at
        : Date.now()

  return { id, start, end, durationMs, task, tag, notes, updatedAt }
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
    if (cleaned.length) await db.sessions.bulkAdd(cleaned)
  })
  enqueue({ kind: 'replace', table: 'sessions' })
}

export async function exportAll(): Promise<{ settings: unknown; sessions: Session[] }> {
  const sessions = await db.sessions.orderBy('start').toArray()
  let settings: unknown = null
  try {
    const raw = localStorage.getItem('pomodoro.settings')
    if (raw) settings = JSON.parse(raw)
  } catch {
    /* fallback to null */
  }
  return { settings, sessions }
}