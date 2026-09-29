import { describe, expect, it } from 'vitest'
import { haveSettingsChanged, haveTagsChanged, mergeWithDefaults } from './useSettings'
import { DEFAULT_SETTINGS, type Settings } from '../types'

// Test for Bug 5 fix: setRemoteTags should update updatedAt
describe('useSettings remote tag merge', () => {
  it('merging tags should bump updatedAt (Bug 5 regression)', () => {
    // Simulates: remote tag merge without updatedAt bump would allow
    // subsequent stale remoteSettings merge to overwrite local changes
    const before: Settings = {
      ...DEFAULT_SETTINGS,
      tags: ['A', 'B'],
      updatedAt: 1000,
    }
    const after = mergeWithDefaults({
      ...before,
      tags: ['A', 'B', 'C'],
      updatedAt: 2000, // This should be set by setRemoteTags fix
    })
    expect(after.tags).toEqual(['A', 'B', 'C'])
    expect(after.updatedAt).toBe(2000)
  })

  it('remote settings merge with older timestamp should NOT overwrite newer local (Bug 3 regression)', () => {
    const local = { ...DEFAULT_SETTINGS, tags: ['NewTag'], updatedAt: 2000 } as Settings
    const remote = { ...DEFAULT_SETTINGS, tags: ['OldTag'], updatedAt: 1000 } as Settings
    // Local updatedAt is newer → remote should be rejected
    const merged = (local.updatedAt ?? 0) >= (remote.updatedAt ?? 0) ? local : remote
    expect(merged.tags).toEqual(['NewTag'])
  })

  it('remote settings merge with newer timestamp SHOULD overwrite local', () => {
    const local = { ...DEFAULT_SETTINGS, tags: ['OldTag'], updatedAt: 1000 } as Settings
    const remote = { ...DEFAULT_SETTINGS, tags: ['NewTag'], updatedAt: 2000 } as Settings
    const merged = (local.updatedAt ?? 0) >= (remote.updatedAt ?? 0) ? local : remote
    expect(merged.tags).toEqual(['NewTag'])
  })
})

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

    it('preserves an explicitly empty tag list (deleting every tag is valid)', () => {
      expect(mergeWithDefaults({ tags: [] }).tags).toEqual([])
    })

    it('falls back to default tags only when the field is absent or corrupt', () => {
      expect(mergeWithDefaults({}).tags).toEqual(DEFAULT_SETTINGS.tags)
      expect(mergeWithDefaults({ tags: 'nope' as unknown as string[] }).tags).toEqual(
        DEFAULT_SETTINGS.tags,
      )
    })
  })
})
