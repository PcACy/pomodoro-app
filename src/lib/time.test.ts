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

    it('defines weekday short labels starting with Monday', () => {
      expect(WEEKDAY_SHORT).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
    })
  })

  describe('dayKey', () => {
    it('formats a date as YYYY-MM-DD with zero padding for single digits', () => {
      const date = new Date(2026, 0, 5, 14, 30, 0) // Jan 5, 2026
      expect(dayKey(date)).toBe('2026-01-05')
    })

    it('handles double digit months and days correctly', () => {
      const date = new Date(2025, 11, 25, 9, 0, 0) // Dec 25, 2025
      expect(dayKey(date)).toBe('2025-12-25')
    })
  })

  describe('startOfDay', () => {
    it('resets hours, minutes, seconds, and milliseconds to midnight', () => {
      const date = new Date(2025, 4, 14, 15, 45, 30, 500)
      const res = startOfDay(date)

      expect(res.getFullYear()).toBe(2025)
      expect(res.getMonth()).toBe(4)
      expect(res.getDate()).toBe(14)
      expect(res.getHours()).toBe(0)
      expect(res.getMinutes()).toBe(0)
      expect(res.getSeconds()).toBe(0)
      expect(res.getMilliseconds()).toBe(0)
    })
  })

  describe('startOfWeek', () => {
    it('returns Monday as the start of the week for every day of the week', () => {
      // Monday May 12, 2025 to Sunday May 18, 2025
      const monday = new Date(2025, 4, 12, 10, 0, 0)
      const tuesday = new Date(2025, 4, 13, 11, 15, 0)
      const wednesday = new Date(2025, 4, 14, 12, 30, 0)
      const thursday = new Date(2025, 4, 15, 13, 45, 0)
      const friday = new Date(2025, 4, 16, 14, 0, 0)
      const saturday = new Date(2025, 4, 17, 15, 0, 0)
      const sunday = new Date(2025, 4, 18, 16, 0, 0)

      const expectedStartKey = '2025-05-12'

      const days = [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
      days.forEach((d) => {
        const start = startOfWeek(d)
        expect(dayKey(start)).toBe(expectedStartKey)
        expect(start.getHours()).toBe(0)
        expect(start.getMinutes()).toBe(0)
        expect(start.getSeconds()).toBe(0)
      })
    })

    it('handles week boundary crossing month and year boundaries', () => {
      // Sunday Jan 4, 2026 -> start of week is Monday Dec 29, 2025
      const sunJan4 = new Date(2026, 0, 4, 12, 0, 0)
      const start = startOfWeek(sunJan4)
      expect(dayKey(start)).toBe('2025-12-29')
    })
  })

  describe('addDays', () => {
    it('adds and subtracts days while preserving time components', () => {
      const base = new Date(2025, 4, 14, 10, 20, 30, 400)

      const added = addDays(base, 5)
      expect(dayKey(added)).toBe('2025-05-19')
      expect(added.getHours()).toBe(10)
      expect(added.getMinutes()).toBe(20)
      expect(added.getSeconds()).toBe(30)
      expect(added.getMilliseconds()).toBe(400)

      const subtracted = addDays(base, -3)
      expect(dayKey(subtracted)).toBe('2025-05-11')
      expect(subtracted.getHours()).toBe(10)
      expect(subtracted.getMinutes()).toBe(20)
    })
  })

  describe('sameDay', () => {
    it('returns true when two dates represent the same local calendar day', () => {
      const d1 = new Date(2025, 4, 14, 8, 0, 0)
      const d2 = new Date(2025, 4, 14, 23, 59, 59)
      expect(sameDay(d1, d2)).toBe(true)
    })

    it('returns false when dates represent different days', () => {
      const d1 = new Date(2025, 4, 14, 23, 59, 59)
      const d2 = new Date(2025, 4, 15, 0, 0, 0)
      expect(sameDay(d1, d2)).toBe(false)
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
      expect(fmtTime(65_000)).toBe('01:05')
      expect(fmtTime(25 * 60_000)).toBe('25:00')
      expect(fmtTime(59 * 60_000 + 59_000)).toBe('59:59')
    })

    it('formats hours when ms >= 1 hour', () => {
      expect(fmtTime(3600_000)).toBe('1:00:00')
      expect(fmtTime(3661_000)).toBe('1:01:01')
      expect(fmtTime(10 * 3600_000 + 5 * 60_000 + 9_000)).toBe('10:05:09')
      expect(fmtTime(25 * 3600_000 + 120_000 + 3_000)).toBe('25:02:03')
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
    it('formats duration < 60 minutes in German and English', () => {
      expect(fmtDuration(0)).toBe('0 min')
      expect(fmtDuration(25 * 60_000)).toBe('25 min')
      expect(fmtDuration(25 * 60_000, 'de')).toBe('25 min')
      expect(fmtDuration(25 * 60_000, 'en')).toBe('25 min')
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
      expect(fmtDuration(120 * 60_000, 'de')).toBe('2 h')
      expect(fmtDuration(120 * 60_000, 'en')).toBe('2h')
    })

    it('formats hours and minutes in German and English', () => {
      expect(fmtDuration(90 * 60_000)).toBe('1 h 30 min')
      expect(fmtDuration(90 * 60_000, 'de')).toBe('1 h 30 min')
      expect(fmtDuration(90 * 60_000, 'en')).toBe('1h 30m')

      expect(fmtDuration(135 * 60_000, 'de')).toBe('2 h 15 min')
      expect(fmtDuration(135 * 60_000, 'en')).toBe('2h 15m')
    })
  })

  describe('fmtDate and fmtDateTime', () => {
    it('formats date according to locale', () => {
      const date = new Date(2025, 4, 14, 14, 30)
      const formatted = fmtDate(date, 'de-DE')
      expect(formatted).toMatch(/14\.05\.2025/)
    })

    it('formats date and time according to locale', () => {
      const date = new Date(2025, 4, 14, 14, 30)
      const formatted = fmtDateTime(date, 'de-DE')
      expect(formatted).toMatch(/14\.05\./)
      expect(formatted).toMatch(/14:30/)
    })
  })
})
