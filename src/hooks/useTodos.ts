import { useCallback, useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS, type TodoItem } from '../types'
import { uid } from '../lib/uid'
import { enqueue } from '../lib/syncQueue'
import { readTodosLocal, sanitizeTodoItem, writeTodosLocal } from '../lib/localTodos'

interface TodoPatch {
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
  // Mirror of state for updater-free writes: side effects (localStorage,
  // sync queue) must not run inside a setState updater, which StrictMode
  // may invoke twice. Storage events keep the ref in sync cross-tab; JS
  // run-to-completion makes the synchronous read-compute-write below atomic.
  const todosRef = useRef(todos)

  const updateTodos = useCallback((updater: (prev: TodoItem[]) => TodoItem[]) => {
    const next = updater(todosRef.current)
    todosRef.current = next
    writeTodosLocal(next)
    setTodos(next)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.todos) {
        if (!e.newValue) {
          todosRef.current = []
          setTodos([])
          return
        }
        try {
          const parsed: unknown = JSON.parse(e.newValue)
          if (Array.isArray(parsed)) {
            // Sanitize like the initial read: another tab (or a corrupt
            // write) must not inject malformed todo objects.
            const valid: TodoItem[] = []
            for (const item of parsed) {
              const sanitized = sanitizeTodoItem(item)
              if (sanitized) valid.push(sanitized)
            }
            todosRef.current = valid
            setTodos(valid)
          }
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
      const target = todosRef.current.find((t) => t.id === id)
      if (!target) return
      updateTodos((prev) => prev.map((t) => (t.id === id ? withUpdatedAt({ ...t, pomodoros: t.pomodoros + 1 }) : t)))
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