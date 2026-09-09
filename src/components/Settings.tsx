import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Download,
  FileDown,
  Github,
  Loader2,
  LogOut,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import type { Settings, Session, TodoItem } from '../types'
import type { ColorMode } from '../themes'
import { clearSessions, exportAll } from '../lib/db'
import { dayKey } from '../lib/time'
import { downloadText, sessionsToCsv, sessionsToJson, todosToCsv, todosToJson } from '../lib/dataExport'
import { useTranslation } from '../hooks/useTranslation'
import { playMicroClick } from '../lib/sound'
import { isNotifyEffective, writeNotifyFlag } from '../lib/notify'
import type { SyncStatus } from '../hooks/useSync'
import type { GitHubProfile } from '../hooks/useAuth'
import { SlidingSegmentedControl } from './SlidingSegmentedControl'
import { getTagColor } from './TodoList'
import { MechanicalSwitch } from './MechanicalSwitch'

import {
  SOUND_KEY,
  AUTO_BREAKS_KEY,
  readFlag,
  writeFlag,
  subscribeFlags,
} from '../lib/flagsStore'

interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
  ariaLabel?: string
  className?: string
}

function useHoldToRepeat(callback: () => void, disabled: boolean) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const timerRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return
      callbackRef.current()
      stop()
      timerRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(() => {
          callbackRef.current()
        }, 75)
      }, 350)
    },
    [disabled, stop],
  )

  useEffect(() => () => stop(), [stop])

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  }
}

function StepperButton({
  icon: Icon,
  onClick,
  disabled,
  ariaLabel,
  side,
}: {
  icon: typeof Minus
  onClick: () => void
  disabled: boolean
  ariaLabel: string
  side: 'left' | 'right'
}) {
  const holdHandlers = useHoldToRepeat(() => {
    playMicroClick('tap')
    onClick()
  }, disabled)

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        // Pointer input already fired via onPointerDown (hold-repeat):
        // only handle keyboard activation here (click with detail === 0),
        // otherwise keyboard users could never operate the stepper.
        if (e.detail === 0) {
          playMicroClick('tap')
          onClick()
        } else {
          e.preventDefault()
        }
      }}
      {...holdHandlers}
      className={`w-9 h-full flex items-center justify-center text-muted hover:text-fg hover:bg-black/5 dark:hover:bg-white/10 disabled:pointer-events-none disabled:opacity-20 cursor-pointer transition-colors select-none ${
        side === 'left' ? 'border-r border-line dark:border-white/10' : 'border-l border-line dark:border-white/10'
      }`}
    >
      <Icon size={12} />
    </button>
  )
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  ariaLabel,
  className = '',
}: NumberStepperProps) {
  const [localStr, setLocalStr] = useState<string | null>(null)

  const handleDecrement = useCallback(() => {
    const next = Math.max(min, value - step)
    onChange(next)
    setLocalStr(null)
  }, [min, onChange, step, value])

  const handleIncrement = useCallback(() => {
    const next = Math.min(max, value + step)
    onChange(next)
    setLocalStr(null)
  }, [max, onChange, step, value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setLocalStr(raw)
    if (!/^\d+$/.test(raw.trim())) return
    const parsed = Number(raw)
    if (parsed >= min && parsed <= max) {
      onChange(parsed)
    }
  }

  const handleBlur = () => {
    if (localStr != null) {
      const parsed = Number(localStr)
      if (Number.isNaN(parsed) || parsed < min) {
        onChange(min)
      } else if (parsed > max) {
        onChange(max)
      } else {
        onChange(Math.round(parsed))
      }
      setLocalStr(null)
    }
  }

  const displayVal = localStr !== null ? localStr : String(value)

  return (
    <div
      className={`h-10 flex items-center justify-between rounded-lg border border-line dark:border-white/10 bg-canvas/30 dark:bg-white/[0.02] overflow-hidden transition-colors focus-within:border-fg ${className}`}
    >
      <StepperButton
        icon={Minus}
        onClick={handleDecrement}
        disabled={value <= min}
        ariaLabel={`${ariaLabel ?? 'Wert'} verringern`}
        side="left"
      />

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1">
        <input
          type="number"
          min={min}
          max={max}
          value={displayVal}
          onChange={handleInputChange}
          onBlur={handleBlur}
          aria-label={ariaLabel}
          className="w-12 bg-transparent text-center font-mono text-sm font-medium tabular-nums text-fg focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="select-none font-mono text-[10px] uppercase text-muted tracking-wider shrink-0">
            {suffix}
          </span>
        )}
      </div>

      <StepperButton
        icon={Plus}
        onClick={handleIncrement}
        disabled={value >= max}
        ariaLabel={`${ariaLabel ?? 'Wert'} erhöhen`}
        side="right"
      />
    </div>
  )
}

interface Preset {
  id: 'classic' | 'deepWork' | 'ultradian'
  name: { de: string; en: string }
  focus: number
  shortBreak: number
  longBreak: number
}

const PRESETS: Preset[] = [
  { id: 'classic', name: { de: 'Klassisch', en: 'Classic' }, focus: 25, shortBreak: 5, longBreak: 15 },
  { id: 'deepWork', name: { de: 'Deep Work', en: 'Deep Work' }, focus: 50, shortBreak: 10, longBreak: 30 },
  { id: 'ultradian', name: { de: 'Ultradian', en: 'Ultradian' }, focus: 90, shortBreak: 20, longBreak: 30 },
]

function ProfileAvatar({ avatarUrl, name }: { avatarUrl?: string; name: string }) {
  const [failed, setFailed] = useState(false)

  if (!avatarUrl || failed) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-fg border border-line">
        {name ? name.slice(0, 1).toUpperCase() : '?'}
      </span>
    )
  }

  return (
    <img
      src={avatarUrl}
      alt={name}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
    />
  )
}

interface Props {
  settings: Settings
  update: (updater: (s: Settings) => Settings) => void
  colorMode: ColorMode
  onColorModeChange: (mode: ColorMode) => void
  sessions: Session[]
  todos: TodoItem[]
  syncStatus: SyncStatus
  syncPending: boolean
  syncLastSyncAt: number | null
  syncProfile: GitHubProfile | null
  syncAvailable: boolean
  syncLoading: boolean
  onSyncLogin: () => void
  onSyncLogout: () => void
  onSyncNow: () => void
}

export const SettingsPanel = memo(function SettingsPanel({
  settings,
  update,
  colorMode,
  onColorModeChange,
  sessions,
  todos,
  syncStatus,
  syncPending,
  syncLastSyncAt,
  syncProfile,
  syncAvailable,
  syncLoading,
  onSyncLogin,
  onSyncLogout,
  onSyncNow,
}: Props) {
  const { t, lang, setLang } = useTranslation()
  const [newTag, setNewTag] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)
  const [errorNonce, setErrorNonce] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // System Hardware Flags (notify shares its initializer with Quick Settings)
  const [soundEnabled, setSoundEnabled] = useState(() => readFlag(SOUND_KEY, false))
  const [autoBreaks, setAutoBreaks] = useState(() => readFlag(AUTO_BREAKS_KEY, true))
  const [notifyEnabled, setNotifyEnabled] = useState(() => isNotifyEffective())

  // Destructive Confirmation State (Inline Two-Step)
  const [confirmClear, setConfirmClear] = useState(false)

  // Listen for storage events across tabs / components
  useEffect(() => {
    return subscribeFlags((key) => {
      if (!key || key === SOUND_KEY) setSoundEnabled(readFlag(SOUND_KEY, false))
      if (!key || key === AUTO_BREAKS_KEY) setAutoBreaks(readFlag(AUTO_BREAKS_KEY, true))
      setNotifyEnabled(isNotifyEffective())
    })
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      writeFlag(SOUND_KEY, next)
      return next
    })
  }, [])

  const toggleAutoBreaks = useCallback(() => {
    setAutoBreaks((prev) => {
      const next = !prev
      writeFlag(AUTO_BREAKS_KEY, next)
      return next
    })
  }, [])

  const toggleNotify = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission().then((perm) => {
          const granted = perm === 'granted'
          setNotifyEnabled(granted)
          writeNotifyFlag(granted)
        })
        return
      }
    }
    setNotifyEnabled((prev) => {
      const next = !prev
      writeNotifyFlag(next)
      return next
    })
  }, [])

  const triggerShake = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.classList.remove('animate-shake')
    void el.offsetWidth
    el.classList.add('animate-shake')
  }, [])

  const canAdd = newTag.trim().length > 0
  const [popNonce, setPopNonce] = useState(0)
  const prevCanAddRef = useRef(false)
  useEffect(() => {
    if (canAdd && !prevCanAddRef.current) setPopNonce((n) => n + 1)
    prevCanAddRef.current = canAdd
  }, [canAdd])

  const todayKey = dayKey(new Date())

  const handleBackup = () => {
    playMicroClick('tap')
    void exportAll().then((data) => {
      downloadText(`pomodoro-backup-${todayKey}.json`, JSON.stringify(data, null, 2), 'application/json')
    })
  }

  const handleSessionsCsv = () => {
    playMicroClick('tap')
    downloadText(`pomodoro-sessions-${todayKey}.csv`, sessionsToCsv(sessions), 'text/csv')
  }

  const handleSessionsJson = () => {
    playMicroClick('tap')
    downloadText(`pomodoro-sessions-${todayKey}.json`, sessionsToJson(sessions), 'application/json')
  }

  const handleTodosCsv = () => {
    playMicroClick('tap')
    downloadText(`pomodoro-todos-${todayKey}.csv`, todosToCsv(todos), 'text/csv')
  }

  const handleTodosJson = () => {
    playMicroClick('tap')
    downloadText(`pomodoro-todos-${todayKey}.json`, todosToJson(todos), 'application/json')
  }

  const setPhaseDuration = (key: keyof Settings['phases'], value: number) => {
    const v = Math.max(1, Math.min(180, Math.round(value) || 1))
    update((s) => ({ ...s, phases: { ...s.phases, [key]: v } }))
  }

  const addTag = () => {
    const trimmed = newTag.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    if (settings.tags.includes(trimmed)) {
      setTagError(t.settings.tagAlreadyExists)
      setErrorNonce((n) => n + 1)
      triggerShake()
      inputRef.current?.focus()
      return
    }
    playMicroClick('tap')
    update((s) => ({ ...s, tags: [...s.tags, trimmed] }))
    setNewTag('')
    setTagError(null)
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    playMicroClick('tap')
    update((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }))
  }

  return (
    <div className="flex w-full flex-col gap-7 font-mono">
      {/* 01 TIMER ENGINE */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest text-muted uppercase">
            01 &nbsp;TIMER ENGINE
          </span>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted">
            {t.settings.presets}
          </span>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {PRESETS.map((p) => {
              const active =
                settings.phases.focus === p.focus &&
                settings.phases.shortBreak === p.shortBreak &&
                settings.phases.longBreak === p.longBreak
              const presetName = lang === 'de' ? p.name.de : p.name.en
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    playMicroClick('tap')
                    update((s) => ({
                      ...s,
                      phases: {
                        ...s.phases,
                        focus: p.focus,
                        shortBreak: p.shortBreak,
                        longBreak: p.longBreak,
                      },
                    }))
                  }}
                  className={`group relative flex flex-col items-center justify-center rounded-card border py-2 px-1.5 sm:px-2 font-mono transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                    active
                      ? 'border-fg bg-fg text-canvas'
                      : 'border-line bg-canvas text-muted hover:border-fg/40 hover:text-fg'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 max-w-full">
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    )}
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">
                      {presetName}
                    </span>
                  </div>
                  <span
                    className={`mt-0.5 text-[9px] sm:text-[10px] tracking-wider tabular-nums font-mono ${
                      active ? 'text-canvas/75' : 'text-muted/60 group-hover:text-muted'
                    }`}
                  >
                    {p.focus} / {p.shortBreak} {t.settings.minUnit}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3-Column Phases Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted">{t.phases.focus}</span>
            <NumberStepper
              value={settings.phases.focus}
              min={1}
              max={180}
              step={5}
              suffix={t.settings.minUnit}
              ariaLabel={t.phases.focus}
              onChange={(val) => setPhaseDuration('focus', val)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted">{t.phases.shortBreak}</span>
            <NumberStepper
              value={settings.phases.shortBreak}
              min={1}
              max={60}
              step={1}
              suffix={t.settings.minUnit}
              ariaLabel={t.phases.shortBreak}
              onChange={(val) => setPhaseDuration('shortBreak', val)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted">{t.phases.longBreak}</span>
            <NumberStepper
              value={settings.phases.longBreak}
              min={1}
              max={90}
              step={1}
              suffix={t.settings.minUnit}
              ariaLabel={t.phases.longBreak}
              onChange={(val) => setPhaseDuration('longBreak', val)}
            />
          </div>
        </div>

        {/* Subtle Divider */}
        <div className="my-1 border-t border-line/40" />

        {/* Cycle, Daily Goal & Weekly Goal in 3 Columns */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-fg">{t.settings.cycle}</span>
            <NumberStepper
              value={settings.phases.roundsBeforeLongBreak}
              min={1}
              max={12}
              step={1}
              suffix={t.settings.roundsUnit}
              ariaLabel={t.settings.cycle}
              onChange={(val) =>
                update((s) => ({
                  ...s,
                  phases: { ...s.phases, roundsBeforeLongBreak: val },
                }))
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-fg">
              {t.settings.dailyGoal} ({(settings.dailyGoalMinutes / 60).toFixed(1)} H)
            </span>
            <NumberStepper
              value={settings.dailyGoalMinutes}
              min={15}
              max={24 * 60}
              step={15}
              suffix={t.settings.minUnit}
              ariaLabel={t.settings.dailyGoal}
              onChange={(val) =>
                update((s) => ({
                  ...s,
                  dailyGoalMinutes: val,
                }))
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-fg">
              {t.settings.weeklyGoal} ({(settings.weeklyGoalMinutes / 60).toFixed(1)} H)
            </span>
            <NumberStepper
              value={settings.weeklyGoalMinutes}
              min={15}
              max={7 * 24 * 60}
              step={30}
              suffix={t.settings.minUnit}
              ariaLabel={t.settings.weeklyGoal}
              onChange={(val) =>
                update((s) => ({
                  ...s,
                  weeklyGoalMinutes: val,
                }))
              }
            />
          </div>
        </div>
      </section>

      {/* 02 SYSTEM & AUDIO */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest text-muted uppercase">
            02 &nbsp;SYSTEM & AUDIO
          </span>
        </div>

        {/* Language Selection */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{t.settings.language}</h3>
            <p className="text-[11px] text-muted">{t.settings.languageHint}</p>
          </div>
          <SlidingSegmentedControl<'de' | 'en'>
            options={[
              {
                value: 'de',
                label: (
                  <span className="flex items-center gap-1.5">
                    <span>DE</span>
                    <span className="hidden sm:inline">Deutsch</span>
                  </span>
                ),
              },
              {
                value: 'en',
                label: (
                  <span className="flex items-center gap-1.5">
                    <span>EN</span>
                    <span className="hidden sm:inline">English</span>
                  </span>
                ),
              },
            ]}
            value={lang}
            onChange={setLang}
            size="md"
            fullWidth
            ariaLabel={t.settings.language}
          />
        </div>

        {/* Dark / Light Color Mode */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{t.settings.colorMode}</h3>
            <p className="text-[11px] text-muted">{t.settings.colorModeHint}</p>
          </div>
          <SlidingSegmentedControl<ColorMode>
            options={[
              {
                value: 'dark',
                label: t.settings.dark,
                icon: <Moon size={13} />,
              },
              {
                value: 'light',
                label: t.settings.light,
                icon: <Sun size={13} />,
              },
            ]}
            value={colorMode}
            onChange={onColorModeChange}
            size="md"
            fullWidth
            ariaLabel={t.settings.colorMode}
          />
        </div>


        {/* Subtle Divider */}
        <div className="my-1 border-t border-line/40" />

        {/* Mechanical Hardware Switches */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Sound FX Switch */}
          <div
            onClick={toggleSound}
            className="flex items-center justify-between rounded-card border border-line bg-canvas p-3 cursor-pointer hover:border-fg/30 transition-colors group"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-fg group-hover:text-fg transition-colors">
                Sound FX
              </span>
              <span className="text-[9px] text-muted uppercase tracking-wider">
                {soundEnabled ? 'ACTIVE' : 'MUTED'}
              </span>
            </div>
            <MechanicalSwitch
              checked={soundEnabled}
              onChange={toggleSound}
              label="Sound Effects"
            />
          </div>

          {/* Auto Breaks Switch */}
          <div
            onClick={toggleAutoBreaks}
            className="flex items-center justify-between rounded-card border border-line bg-canvas p-3 cursor-pointer hover:border-fg/30 transition-colors group"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-fg group-hover:text-fg transition-colors">
                Auto Breaks
              </span>
              <span className="text-[9px] text-muted uppercase tracking-wider">
                {autoBreaks ? 'AUTOMATIC' : 'MANUAL'}
              </span>
            </div>
            <MechanicalSwitch
              checked={autoBreaks}
              onChange={toggleAutoBreaks}
              label="Auto Breaks"
            />
          </div>

          {/* Desktop Alerts Switch */}
          <div
            onClick={toggleNotify}
            className="flex items-center justify-between rounded-card border border-line bg-canvas p-3 cursor-pointer hover:border-fg/30 transition-colors group"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-fg group-hover:text-fg transition-colors">
                Desktop Alerts
              </span>
              <span className="text-[9px] text-muted uppercase tracking-wider">
                {notifyEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <MechanicalSwitch
              checked={notifyEnabled}
              onChange={toggleNotify}
              label="Desktop Alerts"
            />
          </div>
        </div>
      </section>

      {/* 03 PROJECT TAGS */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest text-muted uppercase">
            03 &nbsp;PROJECT TAGS
          </span>
          <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
            {settings.tags.length} {settings.tags.length === 1 ? 'TAG' : 'TAGS'}
          </span>
        </div>

        <p className="text-[11px] text-muted -mt-1">{t.settings.tagsHint}</p>

        {/* Integrated Hardware Pill Input */}
        <div className="relative flex w-full max-w-md items-center">
          <input
            ref={inputRef}
            type="text"
            value={newTag}
            onChange={(e) => {
              setNewTag(e.target.value)
              if (tagError) setTagError(null)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (!newTag.trim()) return
              addTag()
            }}
            onAnimationEnd={(e) => {
              if (e.animationName === 'shake') e.currentTarget.classList.remove('animate-shake')
            }}
            placeholder={t.settings.newTagPlaceholder}
            className={`w-full rounded-full border bg-canvas pl-4 pr-16 py-2 text-xs text-fg placeholder:text-muted/60 transition-colors focus:outline-none ${
              tagError ? 'border-accent ring-1 ring-accent/40' : 'border-line focus:border-fg'
            }`}
            maxLength={30}
          />
          <div className="absolute right-1.5 flex items-center gap-1.5">
            <kbd className="hidden select-none rounded border border-line bg-surface px-1.5 py-0.5 text-[9px] text-muted/60 sm:inline-block">
              ⏎
            </kbd>
            <button
              type="button"
              onClick={() => {
                if (canAdd) addTag()
              }}
              aria-disabled={!canAdd}
              tabIndex={canAdd ? 0 : -1}
              title={t.settings.addTag}
              aria-label={t.settings.addTag}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 ${
                canAdd
                  ? 'cursor-pointer bg-fg text-canvas opacity-100 hover:bg-accent hover:text-white active:scale-95'
                  : 'pointer-events-none cursor-not-allowed bg-transparent text-muted opacity-30'
              }`}
            >
              <span key={popNonce} className={`flex ${canAdd ? 'animate-add-pop' : ''}`}>
                <Plus size={14} />
              </span>
            </button>
          </div>
        </div>

        {tagError && (
          <p key={errorNonce} className="text-xs text-accent animate-fade-in">
            {tagError}
          </p>
        )}

        {/* Tag Chips Flex-Wrap List */}
        {settings.tags.length === 0 ? (
          <p className="text-xs italic text-muted">{t.settings.noTagsYet}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {settings.tags.map((tag) => {
              const tagColor = getTagColor(tag)
              return (
                <span
                  key={tag}
                  className="group inline-flex animate-chip-in items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-fg/40 select-none"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: tagColor,
                    }}
                  />
                  <span className="max-w-[160px] truncate">{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-accent/15 hover:text-accent"
                    title={t.settings.removeTag(tag)}
                    aria-label={t.settings.removeTag(tag)}
                  >
                    <X size={11} />
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </section>

      {/* 04 CLOUD SYNC */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest text-muted uppercase">
            04 &nbsp;CLOUD SYNC
          </span>
        </div>

        <p className="text-[11px] text-muted -mt-1">{t.sync.hint}</p>

        {!syncAvailable ? (
          <p className="text-xs text-muted">{t.sync.notConfigured}</p>
        ) : syncStatus === 'signed-out' ? (
          <div>
            <button
              type="button"
              onClick={() => {
                playMicroClick('tap')
                onSyncLogin()
              }}
              className="flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-xs font-mono text-fg hover:border-fg/50 hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <Github size={14} />
              <span>{t.sync.login}</span>
            </button>
          </div>
        ) : syncStatus === 'syncing' || syncLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin text-muted" />
            <span>{t.sync.syncing}</span>
          </div>
        ) : syncStatus === 'offline' || syncStatus === 'error' ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t.sync.offline}
            </span>
            <button
              type="button"
              onClick={() => {
                playMicroClick('tap')
                onSyncNow()
              }}
              className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted hover:text-fg hover:border-fg/40 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} /> {t.sync.retry}
            </button>
          </div>
        ) : syncProfile ? (
          <div className="flex flex-wrap items-center gap-3">
            <ProfileAvatar avatarUrl={syncProfile.avatarUrl} name={syncProfile.name} />
            <span className="text-xs font-bold uppercase tracking-wider text-fg">{syncProfile.name}</span>
            {syncPending ? (
              <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-[10px] text-muted">
                {t.sync.pending}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-[10px] text-accent">
                <Check size={11} /> {t.sync.synced}
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playMicroClick('tap')
                  onSyncNow()
                }}
                className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted hover:text-fg hover:border-fg/40 transition-colors cursor-pointer"
                title={t.sync.syncNow}
              >
                <RefreshCw size={12} /> {t.sync.syncNow}
              </button>
              <button
                type="button"
                onClick={() => {
                  playMicroClick('tap')
                  onSyncLogout()
                }}
                className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs text-muted hover:text-fg hover:border-fg/40 transition-colors cursor-pointer"
              >
                <LogOut size={12} /> {t.sync.logout}
              </button>
            </span>
          </div>
        ) : null}

        {syncStatus === 'synced' && syncLastSyncAt != null && (
          <p className="text-[10px] text-muted">
            {t.sync.lastSync(new Date(syncLastSyncAt))}
          </p>
        )}
      </section>

      {/* 05 DATA & MEMORY */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest text-muted uppercase">
            05 &nbsp;DATA & MEMORY
          </span>
        </div>

        <p className="text-[11px] text-muted -mt-1">{t.settings.dataHint}</p>

        {/* Export Matrix */}
        <div className="flex flex-col divide-y divide-line border border-line rounded-lg bg-canvas/30 dark:bg-white/[0.02] overflow-hidden text-xs">
          {/* Row 1: Full Backup */}
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Download size={13} className="text-accent shrink-0" />
              <span className="font-mono font-medium tracking-wider text-fg uppercase">FULL BACKUP</span>
            </div>
            <button
              type="button"
              onClick={handleBackup}
              className="font-mono text-[11px] font-bold tracking-wider px-3 py-1 rounded-[2px] bg-fg text-canvas hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-none"
            >
              .JSON
            </button>
          </div>

          {/* Row 2: Sessions */}
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <FileDown size={13} className="text-muted shrink-0" />
              <span className="font-mono tracking-wider text-muted uppercase">SESSIONS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSessionsCsv}
                title={t.dashboard.sessionsCsvTitle}
                className="font-mono text-[11px] tracking-wider px-2.5 py-1 rounded-[2px] border border-line bg-canvas hover:border-fg/40 hover:text-fg text-muted transition-colors cursor-pointer active:scale-95"
              >
                .CSV
              </button>
              <button
                type="button"
                onClick={handleSessionsJson}
                title={t.dashboard.sessionsJsonTitle}
                className="font-mono text-[11px] tracking-wider px-2.5 py-1 rounded-[2px] border border-line bg-canvas hover:border-fg/40 hover:text-fg text-muted transition-colors cursor-pointer active:scale-95"
              >
                .JSON
              </button>
            </div>
          </div>

          {/* Row 3: Todos */}
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <FileDown size={13} className="text-muted shrink-0" />
              <span className="font-mono tracking-wider text-muted uppercase">TODOS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTodosCsv}
                title={t.dashboard.todosCsvTitle}
                className="font-mono text-[11px] tracking-wider px-2.5 py-1 rounded-[2px] border border-line bg-canvas hover:border-fg/40 hover:text-fg text-muted transition-colors cursor-pointer active:scale-95"
              >
                .CSV
              </button>
              <button
                type="button"
                onClick={handleTodosJson}
                title={t.dashboard.todosJsonTitle}
                className="font-mono text-[11px] tracking-wider px-2.5 py-1 rounded-[2px] border border-line bg-canvas hover:border-fg/40 hover:text-fg text-muted transition-colors cursor-pointer active:scale-95"
              >
                .JSON
              </button>
            </div>
          </div>
        </div>

        {/* Destructive Section (Inline Two-Step Confirmation) */}
        <div className="mt-2 border-t border-line/40 pt-4">
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => {
                playMicroClick('tap')
                setConfirmClear(true)
              }}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20 hover:border-accent cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{t.settings.clearSessions}</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-card border border-accent bg-accent/10 p-3 animate-fade-in">
              <div className="flex items-center gap-2 text-accent">
                <AlertTriangle size={15} />
                <span className="text-xs uppercase tracking-wider font-bold">
                  {t.settings.confirmClear}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    playMicroClick('tap')
                    void clearSessions()
                    setConfirmClear(false)
                  }}
                  className="rounded-full border border-accent bg-accent text-white px-3.5 py-1 text-xs uppercase tracking-wider font-bold hover:opacity-90 cursor-pointer transition-colors"
                >
                  CONFIRM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playMicroClick('tap')
                    setConfirmClear(false)
                  }}
                  className="rounded-full border border-line bg-canvas text-muted hover:text-fg px-3.5 py-1 text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
})
