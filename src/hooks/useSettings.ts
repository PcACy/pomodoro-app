import { useCallback, useMemo } from 'react'
import { useLocalState } from './useLocalState'
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Settings } from '../types'

function mergeWithDefaults(stored: Partial<Settings> | undefined): Settings {
  const phases = { ...DEFAULT_SETTINGS.phases, ...(stored?.phases ?? {}) }
  return {
    phases,
    weeklyGoalMinutes: stored?.weeklyGoalMinutes ?? DEFAULT_SETTINGS.weeklyGoalMinutes,
    tags: stored?.tags?.length ? stored.tags : DEFAULT_SETTINGS.tags,
  }
}

export function useSettings(): [Settings, (updater: (s: Settings) => Settings) => void] {
  const [settings, setSettings] = useLocalState<Partial<Settings>>(STORAGE_KEYS.settings, {})

  const merged = useMemo(() => mergeWithDefaults(settings), [settings])

  const update = useCallback(
    (updater: (s: Settings) => Settings) => {
      setSettings((prev) => updater(mergeWithDefaults(prev)) as Partial<Settings>)
    },
    [setSettings],
  )

  return [merged, update]
}