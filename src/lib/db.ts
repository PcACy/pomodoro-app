import Dexie, { type Table } from 'dexie'
import type { Session } from '../types'
import { uid } from './uid'
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
  const record: Session = { ...session, id }
  await db.sessions.add(record)
  enqueue({ kind: 'upsert', table: 'sessions', id })
  return id
}

export async function updateSessionNotes(id: string, notes: string): Promise<void> {
  await db.sessions.update(id, { notes })
  enqueue({ kind: 'upsert', table: 'sessions', id })
}

export async function clearSessions(): Promise<void> {
  await db.sessions.clear()
  enqueue({ kind: 'replace', table: 'sessions' })
}

export async function importSessions(sessions: Session[]): Promise<void> {
  const cleaned = sessions
    .filter((s) => s && typeof s.start === 'number')
    .map((s) => (s.id ? s : { ...s, id: uid() }))
  await db.transaction('rw', db.sessions, async () => {
    await db.sessions.clear()
    if (cleaned.length) await db.sessions.bulkAdd(cleaned)
  })
  enqueue({ kind: 'replace', table: 'sessions' })
}

export async function exportAll(): Promise<{ settings: unknown; sessions: Session[] }> {
  const sessions = await db.sessions.orderBy('start').toArray()
  return { settings: localStorage.getItem('pomodoro.settings'), sessions }
}