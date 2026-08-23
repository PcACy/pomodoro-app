import { STORAGE_KEYS, type TodoItem } from '../types'

/** Validates and sanitizes unknown input objects into safe, typed TodoItem records. */
export function sanitizeTodoItem(raw: unknown): TodoItem | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Record<string, unknown>
  const id = typeof t.id === 'string' && t.id.trim() ? t.id.slice(0, 100) : null
  if (!id) return null

  const title = typeof t.title === 'string' ? t.title.slice(0, 500) : ''
  if (!title.trim()) return null

  const tag = typeof t.tag === 'string' ? t.tag.slice(0, 100) : ''
  const done = Boolean(t.done)
  const pomodoros =
    typeof t.pomodoros === 'number' && Number.isFinite(t.pomodoros) && t.pomodoros >= 0
      ? Math.floor(t.pomodoros)
      : 0

  const createdAt =
    typeof t.createdAt === 'number' && Number.isFinite(t.createdAt) && t.createdAt > 0
      ? t.createdAt
      : typeof t.created_at === 'number' && Number.isFinite(t.created_at) && t.created_at > 0
        ? t.created_at
        : Date.now()

  const completedAt =
    typeof t.completedAt === 'number' && Number.isFinite(t.completedAt) && t.completedAt > 0
      ? t.completedAt
      : typeof t.completed_at === 'number' && Number.isFinite(t.completed_at) && t.completed_at > 0
        ? t.completed_at
        : undefined

  const updatedAt =
    typeof t.updatedAt === 'number' && Number.isFinite(t.updatedAt)
      ? t.updatedAt
      : typeof t.updated_at === 'number' && Number.isFinite(t.updated_at)
        ? t.updated_at
        : createdAt

  return {
    id,
    title,
    tag,
    done,
    pomodoros,
    createdAt,
    completedAt,
    updatedAt,
  }
}

export function readTodosLocal(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.todos)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid: TodoItem[] = []
    for (const item of parsed) {
      const sanitized = sanitizeTodoItem(item)
      if (sanitized) valid.push(sanitized)
    }
    return valid
  } catch {
    return []
  }
}

export function writeTodosLocal(todos: TodoItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos))
  } catch {
    /* storage full / unavailable */
  }
}