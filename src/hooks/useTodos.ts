import { useCallback } from 'react'
import { useLocalState } from './useLocalState'
import { STORAGE_KEYS, type TodoItem } from '../types'
import { uid } from '../lib/uid'
import { enqueue } from '../lib/syncQueue'

export interface TodoPatch {
  title?: string
  tag?: string
  done?: boolean
  completedAt?: number
}

const withUpdatedAt = (t: TodoItem): TodoItem => ({ ...t, updatedAt: Date.now() })

const preferNewer = (a: TodoItem, b: TodoItem): TodoItem => {
  const ts = (t: TodoItem): number => t.updatedAt ?? t.completedAt ?? t.createdAt
  return ts(b) >= ts(a) ? b : a
}

export function useTodos() {
  const [todos, setTodos] = useLocalState<TodoItem[]>(STORAGE_KEYS.todos, [])

  const add = useCallback(
    (title: string, tag: string) => {
      const t = title.trim()
      if (!t) return
      const todo: TodoItem = {
        id: uid(),
        title: t,
        tag,
        done: false,
        pomodoros: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setTodos((prev) => [...prev, todo])
      enqueue({ kind: 'upsert', table: 'todos', id: todo.id })
    },
    [setTodos],
  )

  const toggle = useCallback(
    (id: string) => {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id
            ? withUpdatedAt({ ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined })
            : t,
        ),
      )
      enqueue({ kind: 'upsert', table: 'todos', id })
    },
    [setTodos],
  )

  const edit = useCallback(
    (id: string, patch: TodoPatch) => {
      setTodos((prev) => prev.map((t) => (t.id === id ? withUpdatedAt({ ...t, ...patch }) : t)))
      enqueue({ kind: 'upsert', table: 'todos', id })
    },
    [setTodos],
  )

  const remove = useCallback(
    (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id))
      enqueue({ kind: 'delete', table: 'todos', id })
    },
    [setTodos],
  )

  const incrementPomodoros = useCallback(
    (id: string | null) => {
      if (!id) return
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? withUpdatedAt({ ...t, pomodoros: t.pomodoros + 1 }) : t)),
      )
      enqueue({ kind: 'upsert', table: 'todos', id })
    },
    [setTodos],
  )

  const mergeRemote = useCallback(
    (remote: TodoItem[]) => {
      if (!remote.length) return
      setTodos((prev) => {
        const byId = new Map<string, TodoItem>()
        for (const t of [...prev, ...remote]) {
          const existing = byId.get(t.id)
          byId.set(t.id, existing ? preferNewer(existing, t) : t)
        }
        return [...byId.values()]
      })
    },
    [setTodos],
  )

  return { todos, add, toggle, edit, remove, incrementPomodoros, mergeRemote }
}