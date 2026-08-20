import { describe, expect, it } from 'vitest'
import {
  MS_PER_DAY,
  MS_PER_MINUTE,
  WEEKDAY_SHORT,
  addDays,
  dayKey,
  fmtDate,
  fmtDateTime,
  fmtDuration,
  fmtElapsed,
  fmtTime,
  sameDay,
  startOfDay,
  startOfWeek,
} from './time'

describe('time lib', () => {
  describe('constants', () => {
    it('defines correct millisecond constants', () => {
      expect(MS_PER_MINUTE).toBe(60_000)
      expect(MS_PER_DAY).toBe(86_400_000)
    })

    it('defines weekday short labels', () => {
      expect(WEEKDAY_SHORT).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
    })
  })

  describe('fmtTime', () => {
    it('formats 0 ms as 00:00', () => {
      expect(fmtTime(0)).toBe('00:00')
    })

    it('handles negative ms by clamping to 00:00', () => {
      expect(fmtTime(-5000)).toBe('00:00')
    })

    it('rounds up sub-second milliseconds using Math.ceil', () => {
      expect(fmtTime(1)).toBe('00:01')
      expect(fmtTime(999)).toBe('00:01')
      expect(fmtTime(1000)).toBe('00:01')
      expect(fmtTime(1001)).toBe('00:02')
    })

    it('formats minutes and seconds under an hour', () => {
      expect(fmtTime(65_000)).toBe('01:05') // 1 min 5 sec
      expect(fmtTime(25 * 60_000)).toBe('25:00') // 25 min
      expect(fmtTime(59 * 60_000 + 59_000)).toBe('59:59')
    })

    it('formats hours when ms >= 1 hour', () => {
      expect(fmtTime(3600_000)).toBe('1:00:00')
      expect(fmtTime(3661_000)).toBe('1:01:01')
      expect(fmtTime(10 * 3600_000 + 5 * 60_000 + 9_000)).toBe('10:05:09')
    })
  })

  describe('fmtElapsed', () => {
    it('formats 0 ms as 00:00:00', () => {
      expect(fmtElapsed(0)).toBe('00:00:00')
    })

    it('handles negative ms by clamping to 00:00:00', () => {
      expect(fmtElapsed(-5000)).toBe('00:00:00')
    })

    it('floors sub-second milliseconds using Math.floor', () => {
      expect(fmtElapsed(999)).toBe('00:00:00')
      expect(fmtElapsed(1000)).toBe('00:00:01')
      expect(fmtElapsed(1999)).toBe('00:00:01')
    })

    it('always includes padded 2-digit hours, minutes, and seconds', () => {
      expect(fmtElapsed(65_000)).toBe('00:01:05')
      expect(fmtElapsed(3600_000 + 120_000 + 3_000)).toBe('01:02:03')
      expect(fmtElapsed(25 * 3600_000)).toBe('25:00:00')
    })
  })

  describe('fmtDuration', () => {
    it('formats duration < 60 minutes', () => {
      expect(fmtDuration(0)).toBe('0 min')
      expect(fmtDuration(25 * 60_000)).toBe('25 min')
      expect(fmtDuration(59 * 60_000)).toBe('59 min')
    })

    it('rounds duration to nearest minute', () => {
      expect(fmtDuration(24 * 60_000 + 29_000)).toBe('24 min')
      expect(fmtDuration(24 * 60_000 + 31_000)).toBe('25 min')
    })

    it('formats exact hours in German (default) and English', () => {
      expect(fmtDuration(60 * 60_000)).toBe('1 h')
      expect(fmtDuration(60 * 60_000, 'de')).toBe('1 h')
      expect(fmtDuration(60 * 60_000, 'en')).toBe('1h')

      expect(fmtDuration(120 * 60_000)).toBe('2 h')
      expect(fmtDuration(120 * 60_000, 'en')).toBe('2h')
    })

    it('formats hours and minutes in German and English', () => {
      expect(fmtDuration(90 * 60_000)).toBe('1 h 30 min')
      expect(fmtDuration(90 * 60_000, 'de')).toBe('1 h 30 min')
      expect(fmtDuration(90 * 60_000, 'en')).toBe('1h 30m')
    })
  })

  describe('dayKey', () => {
    it('returns local YYYY-MM-DD formatted string', () => {
      const date = new Date(2025, 4, 9) // May 9, 2025
      expect(dayKey(date)).toBe('2025-05-09')
    })

    it('pads single-digit month and day', () => {
      const date = new Date(2025, 0, 2) // Jan 2, 2025
      expect(dayKey(date)).toBe('2025-01-02')
    })
  })

  describe('startOfDay', () => {
    it('resets hours, minutes, seconds, milliseconds to 00:00:00.000', () => {
      const date = new Date(2025, 4, 14, 15, 30, 45, 500)
      const start = startOfDay(date)
      expect(start.getFullYear()).toBe(2025)
      expect(start.getMonth()).toBe(4)
      expect(start.getDate()).toBe(14)
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
      expect(start.getMilliseconds()).toBe(0)
    })
  })

  describe('startOfWeek', () => {
    it('finds Monday as the start of the week for Wednesday', () => {
      // May 14, 2025 is Wednesday
      const wednesday = new Date(2025, 4, 14, 15, 30)
      const monday = startOfWeek(wednesday)
      expect(monday.getDate()).toBe(12) // May 12, 2025 is Monday
      expect(monday.getDay()).toBe(1) // Monday
      expect(monday.getHours()).toBe(0)
    })

    it('returns the same day if input is Monday', () => {
      const monday = new Date(2025, 4, 12, 10, 0)
      const start = startOfWeek(monday)
      expect(start.getDate()).toBe(12)
      expect(start.getHours()).toBe(0)
    })

    it('handles Sunday correctly (returns previous Monday)', () => {
      // May 18, 2025 is Sunday
      const sunday = new Date(2025, 4, 18, 20, 0)
      const monday = startOfWeek(sunday)
      expect(monday.getDate()).toBe(12) // Monday May 12
    })
  })

  describe('addDays', () => {
    it('adds positive number of days preserving time components', () => {
      const date = new Date(2025, 4, 14, 12, 30, 15, 100)
      const next = addDays(date, 3)
      expect(next.getDate()).toBe(17)
      expect(next.getHours()).toBe(12)
      expect(next.getMinutes()).toBe(30)
      expect(next.getSeconds()).toBe(15)
      expect(next.getMilliseconds()).toBe(100)
    })

    it('subtracts days when given a negative number', () => {
      const date = new Date(2025, 4, 14, 12, 0)
      const prev = addDays(date, -5)
      expect(prev.getDate()).toBe(9)
    })
  })

  describe('sameDay', () => {
    it('returns true if dates are on the same calendar day', () => {
      const d1 = new Date(2025, 4, 14, 8, 0)
      const d2 = new Date(2025, 4, 14, 22, 30)
      expect(sameDay(d1, d2)).toBe(true)
    })

    it('returns false if dates are on different days', () => {
      const d1 = new Date(2025, 4, 14, 23, 59)
      const d2 = new Date(2025, 4, 15, 0, 1)
      expect(sameDay(d1, d2)).toBe(false)
    })
  })

  describe('fmtDate and fmtDateTime', () => {
    it('fmtDate formats date according to locale', () => {
      const date = new Date(2025, 4, 9, 14, 30)
      const formatted = fmtDate(date, 'de-DE')
      expect(formatted).toMatch(/09\.05\.2025/)
    })

    it('fmtDateTime formats date and time according to locale', () => {
      const date = new Date(2025, 4, 9, 14, 30)
      const formatted = fmtDateTime(date, 'de-DE')
      expect(formatted).toMatch(/09\.05\./)
      expect(formatted).toMatch(/14:30/)
    })
  })
})
