import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS, type TodoItem } from '../types'
import { uid } from '../lib/uid'
import { enqueue } from '../lib/syncQueue'
import { readTodosLocal, writeTodosLocal } from '../lib/localTodos'

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
  const [todos, setTodos] = useState<TodoItem[]>(readTodosLocal)

  const updateTodos = useCallback((updater: (prev: TodoItem[]) => TodoItem[]) => {
    setTodos((prev) => {
      const next = updater(prev)
      writeTodosLocal(next)
      return next
    })
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.todos && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as TodoItem[]
          if (Array.isArray(parsed)) setTodos(parsed)
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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
      updateTodos((prev) => [...prev, todo])
      enqueue({ kind: 'upsert', table: 'todos', id: todo.id })
    },
    [updateTodos],
  )

  const toggle = useCallback(
    (id: string) => {
      updateTodos((prev) =>
        prev.map((t) =>
          t.id === id
            ? withUpdatedAt({ ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined })
            : t,
        ),
      )
      enqueue({ kind: 'upsert', table: 'todos', id })
    },
    [updateTodos],
  )

  const edit = useCallback(
    (id: string, patch: TodoPatch) => {
      updateTodos((prev) => prev.map((t) => (t.id === id ? withUpdatedAt({ ...t, ...patch }) : t)))
      enqueue({ kind: 'upsert', table: 'todos', id })
    },
    [updateTodos],
  )

  const remove = useCallback(
    (id: string) => {
      updateTodos((prev) => prev.filter((t) => t.id !== id))
      enqueue({ kind: 'delete', table: 'todos', id })
    },
    [updateTodos],
  )

  const incrementPomodoros = useCallback(
    (id: string | null) => {
      if (!id) return
      updateTodos((prev) =>
        prev.map((t) => (t.id === id ? withUpdatedAt({ ...t, pomodoros: t.pomodoros + 1 }) : t)),
      )
      enqueue({ kind: 'upsert', table: 'todos', id })
    },
    [updateTodos],
  )

  const mergeRemote = useCallback(
    (remote: TodoItem[]) => {
      if (!remote.length) return
      updateTodos((prev) => {
        const byId = new Map<string, TodoItem>()
        for (const t of [...prev, ...remote]) {
          const existing = byId.get(t.id)
          byId.set(t.id, existing ? preferNewer(existing, t) : t)
        }
        return [...byId.values()]
      })
    },
    [updateTodos],
  )

  return { todos, add, toggle, edit, remove, incrementPomodoros, mergeRemote }
}