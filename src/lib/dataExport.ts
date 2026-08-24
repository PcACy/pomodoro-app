import type { Session, TodoItem } from '../types'
import { dayKey } from './time'

const FORMULA_PREFIX = /^[\=\+\-\@\t\r\|\%]/

function sanitizeCell(value: unknown): string {
  let s = String(value ?? '')
  const trimmed = s.trimStart()
  // Prevent CSV / Spreadsheet Formula Injection while preserving genuine numeric strings
  if (FORMULA_PREFIX.test(trimmed) && !/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    s = `'${s}`
  }
  return s
}

/** RFC-4180-style CSV writer with CSV formula injection mitigation. */
function toCsv(rows: unknown[][], delimiter: string): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = sanitizeCell(cell)
          if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes('\t')) {
            return `"${s.replace(/"/g, '""')}"`
          }
          return s
        })
        .join(delimiter),
    )
    .join('\n')
}

export function sessionsToCsv(sessions: Session[], delimiter = ';'): string {
  const header = ['id', 'start', 'end', 'duration_ms', 'task', 'tag', 'notes', 'date']
  const rows = sessions.map((s) => [
    s.id,
    s.start,
    s.end,
    s.durationMs,
    s.task,
    s.tag,
    s.notes ?? '',
    dayKey(new Date(s.start)),
  ])
  return toCsv([header, ...rows], delimiter)
}

export function todosToCsv(todos: TodoItem[], delimiter = ';'): string {
  const header = ['id', 'title', 'tag', 'done', 'pomodoros', 'created_at', 'completed_at']
  const rows = todos.map((t) => [
    t.id,
    t.title,
    t.tag,
    t.done ? 1 : 0,
    t.pomodoros,
    t.createdAt,
    t.completedAt ?? '',
  ])
  return toCsv([header, ...rows], delimiter)
}

export function sessionsToJson(sessions: Session[]): string {
  return JSON.stringify(
    sessions.map((s) => ({
      id: s.id,
      start: s.start,
      end: s.end,
      durationMs: s.durationMs,
      task: s.task,
      tag: s.tag,
      notes: s.notes ?? null,
      date: dayKey(new Date(s.start)),
    })),
    null,
    2,
  )
}

export function todosToJson(todos: TodoItem[]): string {
  return JSON.stringify(
    todos.map((t) => ({
      id: t.id,
      title: t.title,
      tag: t.tag,
      done: t.done,
      pomodoros: t.pomodoros,
      createdAt: t.createdAt,
      completedAt: t.completedAt ?? null,
    })),
    null,
    2,
  )
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}