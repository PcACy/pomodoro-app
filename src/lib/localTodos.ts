import { STORAGE_KEYS, type TodoItem } from '../types'

export function readTodosLocal(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.todos)
    const parsed = raw ? (JSON.parse(raw) as TodoItem[]) : []
    return Array.isArray(parsed) ? parsed : []
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