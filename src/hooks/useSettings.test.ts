import { describe, expect, it } from 'vitest'
import { haveSettingsChanged, haveTagsChanged, mergeWithDefaults } from './useSettings'
import { DEFAULT_SETTINGS, type Settings } from '../types'

describe('useSettings helpers', () => {
  describe('haveSettingsChanged', () => {
    it('returns false when settings are identical', () => {
      const s1: Settings = { ...DEFAULT_SETTINGS }
      const s2: Settings = { ...DEFAULT_SETTINGS }
      expect(haveSettingsChanged(s1, s2)).toBe(false)
    })

    it('returns false when only tags or updatedAt differ', () => {
      const s1: Settings = { ...DEFAULT_SETTINGS, tags: ['Uni', 'Coding'], updatedAt: 100 }
      const s2: Settings = { ...DEFAULT_SETTINGS, tags: ['Work', 'Sports'], updatedAt: 200 }
      expect(haveSettingsChanged(s1, s2)).toBe(false)
    })

    it('returns true when focus duration changes', () => {
      const s1: Settings = { ...DEFAULT_SETTINGS }
      const s2: Settings = {
        ...DEFAULT_SETTINGS,
        phases: { ...DEFAULT_SETTINGS.phases, focus: 30 },
      }
      expect(haveSettingsChanged(s1, s2)).toBe(true)
    })

    it('returns true when shortBreak duration changes', () => {
      const s1: Settings = { ...DEFAULT_SETTINGS }
      const s2: Settings = {
        ...DEFAULT_SETTINGS,
        phases: { ...DEFAULT_SETTINGS.phases, shortBreak: 10 },
      }
      expect(haveSettingsChanged(s1, s2)).toBe(true)
    })

    it('returns true when longBreak duration changes', () => {
      const s1: Settings = { ...DEFAULT_SETTINGS }
      const s2: Settings = {
        ...DEFAULT_SETTINGS,
        phases: { ...DEFAULT_SETTINGS.phases, longBreak: 25 },
      }
      expect(haveSettingsChanged(s1, s2)).toBe(true)
    })

    it('returns true when roundsBeforeLongBreak changes', () => {
      const s1: Settings = { ...DEFAULT_SETTINGS }
      const s2: Settings = {
        ...DEFAULT_SETTINGS,
        phases: { ...DEFAULT_SETTINGS.phases, roundsBeforeLongBreak: 6 },
      }
      expect(haveSettingsChanged(s1, s2)).toBe(true)
    })

    it('returns true when dailyGoalMinutes changes', () => {
      const s1: Settings = { ...DEFAULT_SETTINGS, dailyGoalMinutes: 120 }
      const s2: Settings = { ...DEFAULT_SETTINGS, dailyGoalMinutes: 180 }
      expect(haveSettingsChanged(s1, s2)).toBe(true)
    })

    it('returns true when weeklyGoalMinutes changes', () => {
      const s1: Settings = { ...DEFAULT_SETTINGS, weeklyGoalMinutes: 300 }
      const s2: Settings = { ...DEFAULT_SETTINGS, weeklyGoalMinutes: 600 }
      expect(haveSettingsChanged(s1, s2)).toBe(true)
    })
  })

  describe('haveTagsChanged', () => {
    it('returns false when tag lists are identical', () => {
      expect(haveTagsChanged(['A', 'B', 'C'], ['A', 'B', 'C'])).toBe(false)
      expect(haveTagsChanged([], [])).toBe(false)
    })

    it('returns true when lengths differ', () => {
      expect(haveTagsChanged(['A', 'B'], ['A', 'B', 'C'])).toBe(true)
      expect(haveTagsChanged(['A', 'B', 'C'], ['A', 'B'])).toBe(true)
    })

    it('returns true when contents or order differ', () => {
      expect(haveTagsChanged(['A', 'B'], ['B', 'A'])).toBe(true)
      expect(haveTagsChanged(['A', 'B'], ['A', 'C'])).toBe(true)
    })
  })

  describe('mergeWithDefaults', () => {
    it('merges partial config into full valid Settings object', () => {
      const merged = mergeWithDefaults({
        phases: { focus: 50 },
        tags: ['Custom'],
      })
      expect(merged.phases.focus).toBe(50)
      expect(merged.phases.shortBreak).toBe(DEFAULT_SETTINGS.phases.shortBreak)
      expect(merged.tags).toEqual(['Custom'])
    })
  })
})
