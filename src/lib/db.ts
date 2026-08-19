import Dexie, { type Table } from 'dexie'
import type { Session } from '../types'

class PomodoroDB extends Dexie {
  sessions!: Table<Session, number>

  constructor() {
    super('pomodoro-db')
    this.version(1).stores({
      sessions: '++id, start, end, tag, task',
    })
  }
}

export const db = new PomodoroDB()

export async function addSession(session: Omit<Session, 'id'>): Promise<number> {
  return db.sessions.add(session)
}

export async function clearSessions(): Promise<void> {
  await db.sessions.clear()
}

export async function importSessions(sessions: Session[]): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    await db.sessions.clear()
    await db.sessions.bulkAdd(sessions.filter((s) => s && typeof s.start === 'number'))
  })
}

export async function exportAll(): Promise<{ settings: unknown; sessions: Session[] }> {
  const sessions = await db.sessions.orderBy('start').toArray()
  return { settings: localStorage.getItem('pomodoro.settings'), sessions }
}