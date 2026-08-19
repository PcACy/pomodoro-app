import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Session } from '../types'

export function useSessions(): Session[] {
  const sessions = useLiveQuery(() => db.sessions.orderBy('start').toArray(), [], [])
  return sessions ?? []
}