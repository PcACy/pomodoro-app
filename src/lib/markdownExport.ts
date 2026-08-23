import type { Session, TodoItem } from '../types'
import { MS_PER_MINUTE, dayKey } from './time'

const fmtClock = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** "125" -> "2h 5m", "50" -> "50m" */
export const fmtMinutesCompact = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

const minutesOf = (s: Session): number => Math.round(s.durationMs / MS_PER_MINUTE)

export interface DayExport {
  date: Date
  key: string
  sessions: Session[]
  totalMinutes: number
  completedCount: number
}

export function buildDayExport(sessions: Session[], date: Date): DayExport {
  const key = dayKey(date)
  const list = sessions
    .filter((s) => dayKey(new Date(s.start)) === key)
    .sort((a, b) => a.start - b.start)
  const totalMinutes = list.reduce((sum, s) => sum + minutesOf(s), 0)
  return { date, key, sessions: list, totalMinutes, completedCount: list.length }
}

/** Obsidian-optimiertes Markdown (Frontmatter + Daily-Note-Struktur). */
export function buildDailyMarkdown(exportData: DayExport, todos?: TodoItem[]): string {
  const { key, sessions, totalMinutes, completedCount } = exportData

  const byTag = new Map<string, { count: number; minutes: number }>()
  for (const s of sessions) {
    const tag = s.tag || 'Ohne Tag'
    const cur = byTag.get(tag) ?? { count: 0, minutes: 0 }
    cur.count += 1
    cur.minutes += minutesOf(s)
    byTag.set(tag, cur)
  }
  const taskLines = [...byTag.entries()]
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .map(
      ([tag, { count, minutes }]) =>
        `- [x] ${tag} (${count} ${count === 1 ? 'Session' : 'Sessions'} - ${minutes}m)`,
    )

  const rows = sessions.map((s) => {
    const start = fmtClock(new Date(s.start))
    const end = fmtClock(new Date(s.end))
    const task = s.task || 'Ohne Aufgabe'
    const tag = s.tag || '—'
    return `| ${start} - ${end} | ${task} | ${tag} | ${minutesOf(s)}m | Abgeschlossen |`
  })

  const reflections = sessions
    .filter((s) => s.notes?.trim())
    .map((s) => {
      const time = fmtClock(new Date(s.start))
      const task = s.task || 'Ohne Aufgabe'
      return `- **${time}** (${task}): ${s.notes!.trim().replace(/\s*\n+\s*/g, ' · ')}`
    })

  const doneToday = (todos ?? [])
    .filter((t) => t.done && t.completedAt && dayKey(new Date(t.completedAt)) === key)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
  const todoLines = doneToday.map((t) => {
    const time = fmtClock(new Date(t.completedAt!))
    const tag = t.tag ? ` (${t.tag})` : ''
    return `- [x] ${t.title}${tag} – erledigt um ${time}`
  })

  return [
    '---',
    `date: ${key}`,
    `total_focus_minutes: ${totalMinutes}`,
    `completed_pomodoros: ${completedCount}`,
    'tags: [pomodoro, focus, log]',
    '---',
    `# Pomodoro Log - ${key}`,
    `- **Fokuszeit gesamt:** ${fmtMinutesCompact(totalMinutes)}`,
    `- **Sessions:** ${completedCount} absolviert`,
    '',
    '### Aufgaben-Übersicht',
    taskLines.length ? taskLines.join('\n') : '- Keine Aufgaben erfasst',
    '',
    '### Erledigte Tasks',
    todoLines.length ? todoLines.join('\n') : '- Keine Tasks erledigt',
    '',
    '### Detaillierter Verlauf',
    '| Uhrzeit | Aufgabe | Kategorie | Dauer | Status |',
    '|---|---|---|---|---|',
    rows.length ? rows.join('\n') : '| — | — | — | — | — |',
    '',
    '### Reflexionen',
    reflections.length ? reflections.join('\n') : '- Keine Reflexionen erfasst',
  ].join('\n')
}

export async function copyMarkdown(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function downloadMarkdown(markdown: string, key: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pomodoro-${key}.md`
  a.click()
  URL.revokeObjectURL(url)
}