import type { Session } from '../types'
import { addDays, dayKey, sameDay, startOfDay, startOfWeek } from './time'

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

export type TimeRange = 'week' | 'month' | 'all'

export interface BarTagBreakdown {
  tag: string
  minutes: number
  color?: string
}

export interface RangeBarStat {
  key: string
  date: Date
  label: string
  fullLabel: string
  minutes: number
  tags: BarTagBreakdown[]
}

const minutesOf = (s: Session): number => Math.round(s.durationMs / 60_000)

export function filterSessionsByRange(sessions: Session[], range: TimeRange): Session[] {
  const now = new Date()
  if (range === 'week') {
    const start = startOfWeek(now)
    return sessions.filter((s) => s.start >= start.getTime())
  }
  if (range === 'month') {
    const start = addDays(startOfDay(now), -29)
    return sessions.filter((s) => s.start >= start.getTime())
  }
  return sessions
}

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

export function averageDailyFocusMinutes(sessions: Session[]): { avgMinutes: number; activeDays: number } {
  const byDay = new Map<string, number>()
  for (const s of sessions) {
    const key = dayKey(new Date(s.start))
    byDay.set(key, (byDay.get(key) ?? 0) + minutesOf(s))
  }
  const activeDays = byDay.size
  if (activeDays === 0) return { avgMinutes: 0, activeDays: 0 }
  const totalMinutes = [...byDay.values()].reduce((a, b) => a + b, 0)
  return {
    avgMinutes: Math.round(totalMinutes / activeDays),
    activeDays,
  }
}

export function totalFocusStats(sessions: Session[]): { totalMinutes: number; totalHours: number; sessionCount: number } {
  const totalMinutes = sessions.reduce((sum, s) => sum + minutesOf(s), 0)
  return {
    totalMinutes,
    totalHours: Number((totalMinutes / 60).toFixed(1)),
    sessionCount: sessions.length,
  }
}

export function pomodoroVsFlowBreakdown(sessions: Session[]): {
  pomodoroPct: number
  flowPct: number
  pomodoroMinutes: number
  flowMinutes: number
} {
  if (sessions.length === 0) return { pomodoroPct: 0, flowPct: 0, pomodoroMinutes: 0, flowMinutes: 0 }
  let pomodoroMinutes = 0
  let flowMinutes = 0
  for (const s of sessions) {
    const m = minutesOf(s)
    if (s.mode === 'flow') {
      flowMinutes += m
    } else {
      pomodoroMinutes += m
    }
  }
  const total = pomodoroMinutes + flowMinutes
  if (total === 0) return { pomodoroPct: 0, flowPct: 0, pomodoroMinutes: 0, flowMinutes: 0 }
  const pomodoroPct = Math.round((pomodoroMinutes / total) * 100)
  const flowPct = 100 - pomodoroPct
  return { pomodoroPct, flowPct, pomodoroMinutes, flowMinutes }
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
  const fromMs = startOfDay(from).getTime()
  const toMs = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime()
  for (const s of sessions) {
    if (s.start >= fromMs && s.start <= toMs) {
      const key = dayKey(new Date(s.start))
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

export function minutesByTag(sessions: Session[], from?: Date, untaggedLabel = 'Ohne Tag'): TagStat[] {
  const totals = new Map<string, number>()
  for (const s of sessions) {
    if (from && new Date(s.start) < from) continue
    const tag = s.tag?.trim() || untaggedLabel
    totals.set(tag, (totals.get(tag) ?? 0) + minutesOf(s))
  }
  return [...totals.entries()]
    .map(([tag, minutes]) => ({ tag, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

export function getYAxisConfig(maxMinutes: number): { domain: [number, number]; ticks: number[] } {
  if (maxMinutes <= 120) {
    return {
      domain: [0, 120],
      ticks: [0, 30, 60, 90, 120],
    }
  }
  const maxHours = Math.ceil(maxMinutes / 60)
  const stepHours = maxHours > 8 ? 2 : 1
  const topHour = Math.ceil(maxHours / stepHours) * stepHours
  const ticks: number[] = []
  for (let h = 0; h <= topHour; h += stepHours) {
    ticks.push(h * 60)
  }
  return {
    domain: [0, topHour * 60],
    ticks,
  }
}

export function formatYAxisTick(minutes: number): string {
  if (minutes === 0) return '0'
  if (minutes < 60) return `${minutes}m`
  const h = minutes / 60
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}

export function rangeBarStats(
  sessions: Session[],
  range: TimeRange,
  locale = 'de-DE',
  untaggedLabel = 'Ohne Tag',
): RangeBarStat[] {
  const now = new Date()
  const today = startOfDay(now)
  const fullFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const shortDateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  })

  if (range === 'week') {
    const monday = startOfWeek(today)
    const out: RangeBarStat[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i)
      const key = dayKey(date)
      const daySessions = sessions.filter((s) => sameDay(new Date(s.start), date))
      const totalMin = daySessions.reduce((acc, s) => acc + minutesOf(s), 0)
      const tags = minutesByTag(daySessions, undefined, untaggedLabel)
      const label = date.toLocaleDateString(locale, { weekday: 'short' })
      out.push({
        key,
        date,
        label,
        fullLabel: fullFormatter.format(date),
        minutes: totalMin,
        tags,
      })
    }
    return out
  }

  if (range === 'month') {
    const startDate = addDays(today, -29)
    const out: RangeBarStat[] = []
    for (let i = 0; i < 30; i++) {
      const date = addDays(startDate, i)
      const key = dayKey(date)
      const daySessions = sessions.filter((s) => sameDay(new Date(s.start), date))
      const totalMin = daySessions.reduce((acc, s) => acc + minutesOf(s), 0)
      const tags = minutesByTag(daySessions, undefined, untaggedLabel)
      const label = shortDateFormatter.format(date)
      out.push({
        key,
        date,
        label,
        fullLabel: fullFormatter.format(date),
        minutes: totalMin,
        tags,
      })
    }
    return out
  }

  // range === 'all'
  if (sessions.length === 0) {
    const out: RangeBarStat[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const label = d.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
      out.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        date: d,
        label,
        fullLabel: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        minutes: 0,
        tags: [],
      })
    }
    return out
  }

  const earliest = new Date(Math.min(...sessions.map((s) => s.start)))
  const startMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const out: RangeBarStat[] = []
  let cursor = startMonth
  // Future-dated sessions (clock skew / bad imports) must not yield an empty
  // chart: span from the earlier to the later of the two boundary months.
  const monthsDiff =
    (currentMonth.getFullYear() - startMonth.getFullYear()) * 12 +
    (currentMonth.getMonth() - startMonth.getMonth())
  if (monthsDiff > 24) {
    cursor = new Date(today.getFullYear(), today.getMonth() - 23, 1)
  }
  const endMonth = monthsDiff >= 0 ? currentMonth : startMonth
  if (monthsDiff < 0) cursor = currentMonth

  while (cursor <= endMonth) {
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const monthSessions = sessions.filter(
      (s) => s.start >= cursor.getTime() && s.start < nextMonth.getTime(),
    )
    const totalMin = monthSessions.reduce((acc, s) => acc + minutesOf(s), 0)
    const tags = minutesByTag(monthSessions, undefined, untaggedLabel)
    const label = cursor.toLocaleDateString(locale, { month: 'short', year: '2-digit' })

    out.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      date: new Date(cursor),
      label,
      fullLabel: cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      minutes: totalMin,
      tags,
    })
    cursor = nextMonth
  }

  return out
}

export interface HeatmapCell {
  key: string
  date: Date
  minutes: number
  dow: number // day of week, 0 = Monday
  count: number // number of sessions that day
}

export interface HeatmapWeek {
  start: Date
  days: HeatmapCell[]
}

/** Last `weeks` calendar weeks as GitHub-style columns (Monday-first). */
export function heatmapData(sessions: Session[], weeks: number): HeatmapWeek[] {
  const totals = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const s of sessions) {
    const d = new Date(s.start)
    const key = dayKey(d)
    totals.set(key, (totals.get(key) ?? 0) + minutesOf(s))
    counts.set(key, (counts.get(key) ?? 0) + 1)
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
        dow: i,
        count: counts.get(key) ?? 0,
      })
    }
    weeksOut.push({ start: cursor, days })
    cursor = addDays(cursor, 7)
  }
  return weeksOut
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