import type { Session } from '../types'
import { MS_PER_DAY, addDays, dayKey, sameDay, startOfDay, startOfWeek } from './time'

export interface TagStat {
  tag: string
  minutes: number
}

export interface DayStat {
  key: string
  date: Date
  minutes: number
}

export interface HourStat {
  hour: number
  count: number
}

const minutesOf = (s: Session): number => Math.round(s.durationMs / 60_000)

export function todayMinutes(sessions: Session[]): number {
  const today = new Date()
  return sessions
    .filter((s) => sameDay(new Date(s.start), today))
    .reduce((sum, s) => sum + minutesOf(s), 0)
}

export function weekMinutes(sessions: Session[]): number {
  const weekStart = startOfWeek(new Date())
  return sessions
    .filter((s) => new Date(s.start) >= weekStart)
    .reduce((sum, s) => sum + minutesOf(s), 0)
}

export function currentStreakDays(sessions: Session[]): number {
  const byDay = new Map<string, boolean>()
  for (const s of sessions) byDay.set(dayKey(new Date(s.start)), true)

  let streak = 0
  let cursor = startOfDay(new Date())
  if (!byDay.has(dayKey(cursor))) cursor = addDays(cursor, -1) // today not finished yet
  while (byDay.has(dayKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Focus minutes per day for the last n days (oldest first), Monday-aligned for charts. */
export function lastNDaysStats(sessions: Session[], n: number): DayStat[] {
  const today = startOfDay(new Date())
  const first = addDays(today, -(n - 1))
  return groupMinutesByDay(sessions, first, today, n)
}

export function groupMinutesByDay(sessions: Session[], from: Date, to: Date, count: number): DayStat[] {
  const totals = new Map<string, number>()
  for (const s of sessions) {
    const d = new Date(s.start)
    if (d >= from && d <= to) {
      const key = dayKey(d)
      totals.set(key, (totals.get(key) ?? 0) + minutesOf(s))
    }
  }
  const out: DayStat[] = []
  for (let i = 0; i < count; i++) {
    const date = addDays(from, i)
    out.push({ key: dayKey(date), date, minutes: totals.get(dayKey(date)) ?? 0 })
  }
  return out
}

export function minutesByTag(sessions: Session[], from?: Date): TagStat[] {
  const totals = new Map<string, number>()
  for (const s of sessions) {
    if (from && new Date(s.start) < from) continue
    const tag = s.tag || 'Ohne Tag'
    totals.set(tag, (totals.get(tag) ?? 0) + minutesOf(s))
  }
  return [...totals.entries()]
    .map(([tag, minutes]) => ({ tag, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

export interface HeatmapCell {
  key: string
  date: Date
  minutes: number
  count: number // index within week column
}

export interface HeatmapWeek {
  start: Date
  days: HeatmapCell[]
}

/** Last `weeks` calendar weeks as GitHub-style columns (Monday-first). */
export function heatmapData(sessions: Session[], weeks: number): HeatmapWeek[] {
  const totals = new Map<string, number>()
  for (const s of sessions) {
    const d = new Date(s.start)
    const key = dayKey(d)
    totals.set(key, (totals.get(key) ?? 0) + minutesOf(s))
  }

  const today = startOfDay(new Date())
  const firstDay = addDays(today, -(weeks * 7 - 1))
  const firstWeekStart = startOfWeek(firstDay)

  const weeksOut: HeatmapWeek[] = []
  let cursor = firstWeekStart
  while (cursor <= today) {
    const days: HeatmapCell[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(cursor, i)
      const key = dayKey(date)
      days.push({
        key,
        date,
        minutes: totals.get(key) ?? 0,
        count: i,
      })
    }
    weeksOut.push({ start: cursor, days })
    cursor = addDays(cursor, 7)
  }
  return weeksOut
}

export function totalMinutesInRange(sessions: Session[], from: Date): number {
  return sessions
    .filter((s) => new Date(s.start) >= from)
    .reduce((sum, s) => sum + minutesOf(s), 0)
}

/** Number of completed sessions per hour of day (0-23), based on the session's end time. */
export function sessionsByHour(sessions: Session[]): HourStat[] {
  const counts = new Array<number>(24).fill(0)
  for (const s of sessions) {
    const end = new Date(s.end)
    if (Number.isNaN(end.getTime())) continue
    counts[end.getHours()] += 1
  }
  return counts.map((count, hour) => ({ hour, count }))
}

export const DAYS_MS = MS_PER_DAY