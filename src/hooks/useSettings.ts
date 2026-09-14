import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocalState } from './useLocalState'
import { DEFAULT_SETTINGS, STORAGE_KEYS, type PhaseConfig, type Settings } from '../types'
import { enqueue } from '../lib/syncQueue'

/** Coerce unknown values to a finite positive number; fall back otherwise. */
const positiveNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback

export type StoredSettings = Partial<Omit<Settings, 'phases'>> & { phases?: Partial<PhaseConfig> }

export function mergeWithDefaults(stored: StoredSettings | undefined): Settings {
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
  const dailyGoalMinutes = Math.max(
    0,
    typeof s.dailyGoalMinutes === 'number' && Number.isFinite(s.dailyGoalMinutes)
      ? s.dailyGoalMinutes
      : DEFAULT_SETTINGS.dailyGoalMinutes,
  )
  const rawTags = Array.isArray(s.tags)
    ? s.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.slice(0, 50))
    : []
  const tags = rawTags.length > 0 ? rawTags : DEFAULT_SETTINGS.tags
  const updatedAt =
    typeof s.updatedAt === 'number' && Number.isFinite(s.updatedAt) && s.updatedAt > 0
      ? s.updatedAt
      : undefined

  return {
    phases,
    dailyGoalMinutes,
    weeklyGoalMinutes,
    tags,
    updatedAt,
  }
}

export function haveSettingsChanged(prev: Settings, next: Settings): boolean {
  return (
    prev.phases.focus !== next.phases.focus ||
    prev.phases.shortBreak !== next.phases.shortBreak ||
    prev.phases.longBreak !== next.phases.longBreak ||
    prev.phases.roundsBeforeLongBreak !== next.phases.roundsBeforeLongBreak ||
    prev.dailyGoalMinutes !== next.dailyGoalMinutes ||
    prev.weeklyGoalMinutes !== next.weeklyGoalMinutes
  )
}

export function haveTagsChanged(prevTags: string[], nextTags: string[]): boolean {
  if (prevTags.length !== nextTags.length) return true
  return prevTags.some((t, i) => t !== nextTags[i])
}

const EMPTY_SETTINGS: Partial<Settings> = {}

export function useSettings(): [
  Settings,
  (updater: (s: Settings) => Settings) => void,
  (remote: Partial<Settings>, remoteUpdatedAt: number) => void,
  (tagsOrUpdater: string[] | ((currentTags: string[]) => string[])) => void,
] {
  const [settings, setSettings] = useLocalState<Partial<Settings>>(STORAGE_KEYS.settings, EMPTY_SETTINGS)

  const merged = useMemo(() => mergeWithDefaults(settings), [settings])
  const settingsRef = useRef(merged)
  useEffect(() => {
    settingsRef.current = merged
  }, [merged])

  const update = useCallback(
    (updater: (s: Settings) => Settings) => {
      const current = settingsRef.current
      const next = updater(current)
      const settingsChanged = haveSettingsChanged(current, next)
      const tagsChanged = haveTagsChanged(current.tags, next.tags)

      if (!settingsChanged && !tagsChanged) {
        return
      }

      const now = Date.now()
      setSettings((prev) => {
        const prevMerged = mergeWithDefaults(prev)
        const updated = updater(prevMerged)
        const didSettingsChange = haveSettingsChanged(prevMerged, updated)
        return {
          ...updated,
          ...(didSettingsChange ? { updatedAt: now } : {}),
        } as Partial<Settings>
      })

      if (settingsChanged) {
        enqueue({ kind: 'upsert', table: 'settings', id: 'settings' })
      }
    },
    [setSettings],
  )

  const mergeRemote = useCallback(
    (remote: Partial<Settings>, remoteUpdatedAt: number) => {
      setSettings((prev) => {
        const current = mergeWithDefaults(prev)
        if ((current.updatedAt ?? 0) >= remoteUpdatedAt) {
          return prev
        }
        const updated = mergeWithDefaults({
          ...current,
          ...remote,
          phases: remote.phases ? { ...current.phases, ...remote.phases } : current.phases,
          updatedAt: remoteUpdatedAt,
        })
        return updated as Partial<Settings>
      })
    },
    [setSettings],
  )

  const setRemoteTags = useCallback(
    (tagsOrUpdater: string[] | ((currentTags: string[]) => string[])) => {
      setSettings((prev) => {
        const current = mergeWithDefaults(prev)
        const nextTags =
          typeof tagsOrUpdater === 'function' ? tagsOrUpdater(current.tags) : tagsOrUpdater
        if (!haveTagsChanged(current.tags, nextTags)) {
          return prev
        }
        return {
          ...prev,
          tags: nextTags,
        }
      })
    },
    [setSettings],
  )

  return [merged, update, mergeRemote, setRemoteTags]
}