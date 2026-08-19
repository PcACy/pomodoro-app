import { useCallback } from 'react'
import { useLocalState } from './useLocalState'
import { STORAGE_KEYS, type TodoItem } from '../types'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export interface TodoPatch {
  title?: string
  tag?: string
  done?: boolean
  completedAt?: number
}

export function useTodos() {
  const [todos, setTodos] = useLocalState<TodoItem[]>(STORAGE_KEYS.todos, [])

  const add = useCallback(
    (title: string, tag: string) => {
      const t = title.trim()
      if (!t) return
      setTodos((prev) => [
        ...prev,
        {
          id: uid(),
          title: t,
          tag,
          done: false,
          pomodoros: 0,
          createdAt: Date.now(),
        },
      ])
    },
    [setTodos],
  )

  const toggle = useCallback(
    (id: string) => {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined } : t,
        ),
      )
    },
    [setTodos],
  )

  const edit = useCallback(
    (id: string, patch: TodoPatch) => {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [setTodos],
  )

  const remove = useCallback(
    (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id))
    },
    [setTodos],
  )

  const incrementPomodoros = useCallback(
    (id: string | null) => {
      if (!id) return
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, pomodoros: t.pomodoros + 1 } : t)),
      )
    },
    [setTodos],
  )

  return { todos, add, toggle, edit, remove, incrementPomodoros }
}