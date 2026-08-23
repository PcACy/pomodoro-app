import { useCallback, useMemo } from 'react'
import { useLocalState } from './useLocalState'
import { DEFAULT_SETTINGS, STORAGE_KEYS, type PhaseConfig, type Settings } from '../types'

/** Coerce unknown values to a finite positive number; fall back otherwise. */
const positiveNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback

function mergeWithDefaults(stored: Partial<Settings> | undefined): Settings {
  // Imported settings files are merged blind (`s as Settings`) and may contain
  // 0/NaN/negative phase durations which would render the timer unusable.
  const rawPhases: Partial<PhaseConfig> = stored?.phases ?? {}
  const phases = {
    focus: positiveNumber(rawPhases.focus, DEFAULT_SETTINGS.phases.focus),
    shortBreak: positiveNumber(rawPhases.shortBreak, DEFAULT_SETTINGS.phases.shortBreak),
    longBreak: positiveNumber(rawPhases.longBreak, DEFAULT_SETTINGS.phases.longBreak),
    roundsBeforeLongBreak: Math.max(
      1,
      Math.round(positiveNumber(rawPhases.roundsBeforeLongBreak, DEFAULT_SETTINGS.phases.roundsBeforeLongBreak)),
    ),
  }
  const weeklyGoalMinutes = Math.max(
    0,
    typeof stored?.weeklyGoalMinutes === 'number' && Number.isFinite(stored.weeklyGoalMinutes)
      ? stored.weeklyGoalMinutes
      : DEFAULT_SETTINGS.weeklyGoalMinutes,
  )
  return {
    phases,
    weeklyGoalMinutes,
    tags: stored?.tags?.length ? stored.tags : DEFAULT_SETTINGS.tags,
    layoutMode: stored?.layoutMode ?? DEFAULT_SETTINGS.layoutMode,
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