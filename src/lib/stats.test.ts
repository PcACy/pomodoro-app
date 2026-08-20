import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  currentStreakDays,
  groupMinutesByDay,
  heatmapData,
  lastNDaysStats,
  minutesByTag,
  sessionsByHour,
  todayMinutes,
  totalMinutesInRange,
  weekMinutes,
} from './stats'
import type { Session } from '../types'

describe('stats lib', () => {
  // Fix time to Wednesday, May 14, 2025 12:00:00
  const mockNow = new Date(2025, 4, 14, 12, 0, 0) // May is month index 4

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const makeSession = (
    overrides: Partial<Session> & { start: number; durationMs: number }
  ): Session => ({
    id: `session-${Math.random().toString(36).substring(2, 9)}`,
    end: overrides.start + overrides.durationMs,
    task: 'Test Task',
    tag: 'Coding',
    ...overrides,
  })

  describe('todayMinutes', () => {
    it('returns 0 when session array is empty', () => {
      expect(todayMinutes([])).toBe(0)
    })

    it('sums minutes for sessions started today', () => {
      const todayStart = new Date(2025, 4, 14, 9, 0, 0).getTime()
      const todayAfternoon = new Date(2025, 4, 14, 14, 0, 0).getTime()
      const yesterday = new Date(2025, 4, 13, 10, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: todayStart, durationMs: 25 * 60_000 }), // 25 min
        makeSession({ start: todayAfternoon, durationMs: 50 * 60_000 }), // 50 min
        makeSession({ start: yesterday, durationMs: 30 * 60_000 }), // 30 min (yesterday)
      ]

      expect(todayMinutes(sessions)).toBe(75)
    })

    it('rounds duration to the nearest minute', () => {
      const todayStart = new Date(2025, 4, 14, 10, 0, 0).getTime()
      const sessions: Session[] = [
        makeSession({ start: todayStart, durationMs: 25 * 60_000 + 40_000 }), // ~25.67 min -> 26 min
      ]

      expect(todayMinutes(sessions)).toBe(26)
    })
  })

  describe('weekMinutes', () => {
    it('returns 0 for empty sessions', () => {
      expect(weekMinutes([])).toBe(0)
    })

    it('sums minutes for sessions starting from Monday of current week', () => {
      // Current date is Wednesday May 14, 2025.
      // Week starts on Monday May 12, 2025.
      const monday = new Date(2025, 4, 12, 8, 0, 0).getTime()
      const wednesday = new Date(2025, 4, 14, 10, 0, 0).getTime()
      const previousSunday = new Date(2025, 4, 11, 23, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: monday, durationMs: 60 * 60_000 }), // 60 min
        makeSession({ start: wednesday, durationMs: 30 * 60_000 }), // 30 min
        makeSession({ start: previousSunday, durationMs: 45 * 60_000 }), // 45 min (previous week)
      ]

      expect(weekMinutes(sessions)).toBe(90)
    })
  })

  describe('currentStreakDays', () => {
    it('returns 0 when there are no sessions', () => {
      expect(currentStreakDays([])).toBe(0)
    })

    it('counts active streak including today', () => {
      const today = new Date(2025, 4, 14, 10, 0, 0).getTime()
      const yesterday = new Date(2025, 4, 13, 10, 0, 0).getTime()
      const twoDaysAgo = new Date(2025, 4, 12, 10, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: today, durationMs: 25 * 60_000 }),
        makeSession({ start: yesterday, durationMs: 25 * 60_000 }),
        makeSession({ start: twoDaysAgo, durationMs: 25 * 60_000 }),
      ]

      expect(currentStreakDays(sessions)).toBe(3)
    })

    it('preserves streak if today has no session yet but yesterday does', () => {
      const yesterday = new Date(2025, 4, 13, 10, 0, 0).getTime()
      const twoDaysAgo = new Date(2025, 4, 12, 10, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: yesterday, durationMs: 25 * 60_000 }),
        makeSession({ start: twoDaysAgo, durationMs: 25 * 60_000 }),
      ]

      expect(currentStreakDays(sessions)).toBe(2)
    })

    it('returns 0 if neither today nor yesterday has a session', () => {
      const twoDaysAgo = new Date(2025, 4, 12, 10, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: twoDaysAgo, durationMs: 25 * 60_000 }),
      ]

      expect(currentStreakDays(sessions)).toBe(0)
    })

    it('stops streak at missing days', () => {
      const today = new Date(2025, 4, 14, 10, 0, 0).getTime()
      const threeDaysAgo = new Date(2025, 4, 11, 10, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: today, durationMs: 25 * 60_000 }),
        makeSession({ start: threeDaysAgo, durationMs: 25 * 60_000 }),
      ]

      expect(currentStreakDays(sessions)).toBe(1)
    })

    it('handles multiple sessions on the same day correctly', () => {
      const today1 = new Date(2025, 4, 14, 9, 0, 0).getTime()
      const today2 = new Date(2025, 4, 14, 15, 0, 0).getTime()
      const yesterday = new Date(2025, 4, 13, 10, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: today1, durationMs: 25 * 60_000 }),
        makeSession({ start: today2, durationMs: 25 * 60_000 }),
        makeSession({ start: yesterday, durationMs: 25 * 60_000 }),
      ]

      expect(currentStreakDays(sessions)).toBe(2)
    })
  })

  describe('totalMinutesInRange', () => {
    it('returns 0 for empty sessions', () => {
      expect(totalMinutesInRange([], new Date(2025, 4, 1, 0, 0, 0))).toBe(0)
    })

    it('filters sessions starting on or after "from" date', () => {
      const from = new Date(2025, 4, 10, 0, 0, 0)
      const afterFrom = new Date(2025, 4, 12, 10, 0, 0).getTime()
      const beforeFrom = new Date(2025, 4, 8, 10, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: afterFrom, durationMs: 40 * 60_000 }),
        makeSession({ start: beforeFrom, durationMs: 60 * 60_000 }),
      ]

      expect(totalMinutesInRange(sessions, from)).toBe(40)
    })
  })

  describe('additional stats helpers', () => {
    it('groupMinutesByDay aggregates minutes for date range', () => {
      const from = new Date(2025, 4, 13, 0, 0, 0)
      const to = new Date(2025, 4, 14, 23, 59, 59)
      const s1 = new Date(2025, 4, 13, 10, 0, 0).getTime()
      const s2 = new Date(2025, 4, 14, 11, 0, 0).getTime()

      const sessions: Session[] = [
        makeSession({ start: s1, durationMs: 30 * 60_000 }),
        makeSession({ start: s2, durationMs: 20 * 60_000 }),
      ]

      const stats = groupMinutesByDay(sessions, from, to, 2)
      expect(stats).toHaveLength(2)
      expect(stats[0].minutes).toBe(30)
      expect(stats[1].minutes).toBe(20)
    })

    it('lastNDaysStats returns last n days stats ending today', () => {
      const todayStart = new Date(2025, 4, 14, 0, 0, 0).getTime()
      const sessions: Session[] = [makeSession({ start: todayStart, durationMs: 25 * 60_000 })]

      const stats = lastNDaysStats(sessions, 3)
      expect(stats).toHaveLength(3)
      expect(stats[2].minutes).toBe(25)
    })

    it('minutesByTag aggregates and sorts minutes by tag', () => {
      const t1 = new Date(2025, 4, 14, 10, 0, 0).getTime()
      const sessions: Session[] = [
        makeSession({ start: t1, durationMs: 30 * 60_000, tag: 'Coding' }),
        makeSession({ start: t1, durationMs: 60 * 60_000, tag: 'Uni' }),
        makeSession({ start: t1, durationMs: 15 * 60_000, tag: '' }),
      ]

      const result = minutesByTag(sessions)
      expect(result).toEqual([
        { tag: 'Uni', minutes: 60 },
        { tag: 'Coding', minutes: 30 },
        { tag: 'Ohne Tag', minutes: 15 },
      ])
    })

    it('sessionsByHour categorizes completed sessions by end hour', () => {
      const start = new Date(2025, 4, 14, 10, 0, 0).getTime()
      const end = new Date(2025, 4, 14, 10, 25, 0).getTime()

      const sessions: Session[] = [
        { ...makeSession({ start, durationMs: 25 * 60_000 }), end },
      ]

      const result = sessionsByHour(sessions)
      expect(result).toHaveLength(24)
      expect(result[10]).toEqual({ hour: 10, count: 1 })
      expect(result[11].count).toBe(0)
    })

    it('heatmapData generates weeks of heatmap cells', () => {
      const today = new Date(2025, 4, 14, 10, 0, 0).getTime()
      const sessions: Session[] = [makeSession({ start: today, durationMs: 50 * 60_000 })]

      const weeks = heatmapData(sessions, 1)
      expect(weeks.length).toBeGreaterThanOrEqual(1)
      const lastWeek = weeks[weeks.length - 1]
      expect(lastWeek.days).toHaveLength(7)
    })
  })
})
