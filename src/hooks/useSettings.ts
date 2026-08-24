import { useCallback, useMemo } from 'react'
import { useLocalState } from './useLocalState'
import { DEFAULT_SETTINGS, STORAGE_KEYS, type PhaseConfig, type Settings } from '../types'

/** Coerce unknown values to a finite positive number; fall back otherwise. */
const positiveNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback

function mergeWithDefaults(stored: Partial<Settings> | undefined): Settings {
  // Imported settings files are merged blind (`s as Settings`) and may contain
  // 0/NaN/negative phase durations or corrupted tags which would render the timer unusable.
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<Settings>
  const rawPhases: Partial<PhaseConfig> = s.phases && typeof s.phases === 'object' ? s.phases : {}
  const phases = {
    focus: Math.min(180, positiveNumber(rawPhases.focus, DEFAULT_SETTINGS.phases.focus)),
    shortBreak: Math.min(180, positiveNumber(rawPhases.shortBreak, DEFAULT_SETTINGS.phases.shortBreak)),
    longBreak: Math.min(180, positiveNumber(rawPhases.longBreak, DEFAULT_SETTINGS.phases.longBreak)),
    roundsBeforeLongBreak: Math.max(
      1,
      Math.min(20, Math.round(positiveNumber(rawPhases.roundsBeforeLongBreak, DEFAULT_SETTINGS.phases.roundsBeforeLongBreak))),
    ),
  }
  const weeklyGoalMinutes = Math.max(
    0,
    typeof s.weeklyGoalMinutes === 'number' && Number.isFinite(s.weeklyGoalMinutes)
      ? s.weeklyGoalMinutes
      : DEFAULT_SETTINGS.weeklyGoalMinutes,
  )
  const rawTags = Array.isArray(s.tags)
    ? s.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.slice(0, 50))
    : []
  const tags = rawTags.length > 0 ? rawTags : DEFAULT_SETTINGS.tags
  const layoutMode = s.layoutMode === 'single' || s.layoutMode === 'split' ? s.layoutMode : DEFAULT_SETTINGS.layoutMode

  return {
    phases,
    weeklyGoalMinutes,
    tags,
    layoutMode,
  }
}

const EMPTY_SETTINGS: Partial<Settings> = {}

export function useSettings(): [Settings, (updater: (s: Settings) => Settings) => void] {
  const [settings, setSettings] = useLocalState<Partial<Settings>>(STORAGE_KEYS.settings, EMPTY_SETTINGS)

  const merged = useMemo(() => mergeWithDefaults(settings), [settings])

  const update = useCallback(
    (updater: (s: Settings) => Settings) => {
      setSettings((prev) => updater(mergeWithDefaults(prev)) as Partial<Settings>)
    },
    [setSettings],
  )

  return [merged, update]
}