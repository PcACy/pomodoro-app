import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Download,
  FileDown,
  FileJson,
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
import type { AccentColor, Settings, Session, TodoItem } from '../types'
import type { ColorMode, ThemeId } from '../themes'
import { clearSessions, exportAll } from '../lib/db'
import { dayKey } from '../lib/time'
import { downloadText, sessionsToCsv, sessionsToJson, todosToCsv, todosToJson } from '../lib/dataExport'
import { useTranslation } from '../hooks/useTranslation'
import { playMicroClick } from '../lib/sound'
import type { SyncStatus } from '../hooks/useSync'
import type { GitHubProfile } from '../hooks/useAuth'
import { SlidingSegmentedControl } from './SlidingSegmentedControl'
import { getTagColor } from './TodoList'

interface AccentOption {
  id: AccentColor
  labelKey: 'accentRed' | 'accentOrange' | 'accentBlue' | 'accentGreen' | 'accentMonochrome'
  colorHex: string
}

const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'red', labelKey: 'accentRed', colorHex: '#D71921' },
  { id: 'orange', labelKey: 'accentOrange', colorHex: '#FA5D29' },
  { id: 'blue', labelKey: 'accentBlue', colorHex: '#38BDF8' },
  { id: 'green', labelKey: 'accentGreen', colorHex: '#22C55E' },
  { id: 'monochrome', labelKey: 'accentMonochrome', colorHex: '#FFFFFF' },
]

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
}: {
  icon: typeof Minus
  onClick: () => void
  disabled: boolean
  ariaLabel: string
}) {
  const holdHandlers = useHoldToRepeat(onClick, disabled)

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
      }}
      {...holdHandlers}
      className="tap-spring flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-fg disabled:pointer-events-none disabled:opacity-25"
    >
      <Icon size={14} />
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
    // All stepper-backed settings are whole numbers (minutes / rounds).
    // Reject decimals live so e.g. "12.5" can't leak a fractional phase or
    // round count into the timer math.
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
      className={`flex items-center justify-between rounded-full border border-line bg-surface p-1 transition-colors focus-within:border-fg ${className}`}
    >
      <StepperButton
        icon={Minus}
        onClick={handleDecrement}
        disabled={value <= min}
        ariaLabel={`${ariaLabel ?? 'Wert'} verringern`}
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
          className="w-12 bg-transparent text-right font-mono text-sm font-semibold tabular-nums text-fg focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && <span className="select-none text-xs font-medium text-muted">{suffix}</span>}
      </div>

      <StepperButton
        icon={Plus}
        onClick={handleIncrement}
        disabled={value >= max}
        ariaLabel={`${ariaLabel ?? 'Wert'} erhöhen`}
      />
    </div>
  )
}

interface Preset {
  id: 'classic' | 'deepWork' | 'ultradian'
  labelKey: 'presetClassic' | 'presetDeepWork' | 'presetUltradian'
  focus: number
  shortBreak: number
  longBreak: number
}

const PRESETS: Preset[] = [
  { id: 'classic', labelKey: 'presetClassic', focus: 25, shortBreak: 5, longBreak: 15 },
  { id: 'deepWork', labelKey: 'presetDeepWork', focus: 50, shortBreak: 10, longBreak: 30 },
  { id: 'ultradian', labelKey: 'presetUltradian', focus: 90, shortBreak: 20, longBreak: 30 },
]

function ProfileAvatar({ avatarUrl, name }: { avatarUrl?: string; name: string }) {
  const [failed, setFailed] = useState(false)

  if (!avatarUrl || failed) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-bold text-fg border border-line">
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
  themeId: ThemeId
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
  themeId: _themeId,
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
  // Increments on every failed attempt so the error message remounts and its
  // fade-in animation replays instead of staying frozen after the first run.
  const [errorNonce, setErrorNonce] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Deterministically restarts the CSS shake animation. A boolean class-toggle
   * alone fails when the animation is already running (rapid duplicate
   * attempts) — removing the class, forcing a reflow and re-adding it always
   * replays from frame 0 without remounting the input (focus is preserved).
   */
  const triggerShake = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.classList.remove('animate-shake')
    void el.offsetWidth
    el.classList.add('animate-shake')
  }, [])

  // Reactive add-button: true as soon as the field holds any real character.
  const canAdd = newTag.trim().length > 0
  // Increments whenever the button wakes from idle to active so its spring
  // pop replays on every empty -> filled transition while typing/deleting.
  const [popNonce, setPopNonce] = useState(0)
  const prevCanAddRef = useRef(false)
  useEffect(() => {
    if (canAdd && !prevCanAddRef.current) setPopNonce((n) => n + 1)
    prevCanAddRef.current = canAdd
  }, [canAdd])

  const todayKey = dayKey(new Date())


  const handleBackup = () => {
    void exportAll().then((data) => {
      downloadText(`pomodoro-backup-${todayKey}.json`, JSON.stringify(data, null, 2), 'application/json')
    })
  }

  const handleSessionsCsv = () => {
    downloadText(`pomodoro-sessions-${todayKey}.csv`, sessionsToCsv(sessions), 'text/csv')
  }

  const handleSessionsJson = () => {
    downloadText(`pomodoro-sessions-${todayKey}.json`, sessionsToJson(sessions), 'application/json')
  }

  const handleTodosCsv = () => {
    downloadText(`pomodoro-todos-${todayKey}.csv`, todosToCsv(todos), 'text/csv')
  }

  const handleTodosJson = () => {
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
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <div className="card p-6">
        <h3 className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-muted">{t.sync.title}</h3>
        <p className="mb-4 font-mono text-[11px] text-muted">{t.sync.hint}</p>

        {!syncAvailable ? (
          <p className="font-mono text-xs text-muted">{t.sync.notConfigured}</p>
        ) : syncStatus === 'signed-out' ? (
          <button type="button" onClick={onSyncLogin} className="btn-primary">
            <Github size={15} /> {t.sync.login}
          </button>
        ) : syncStatus === 'syncing' || syncLoading ? (
          <div className="flex items-center gap-2 font-mono text-xs text-muted">
            <Loader2 size={15} className="animate-spin text-accent" />
            {t.sync.syncing}
          </div>
        ) : syncStatus === 'offline' || syncStatus === 'error' ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 font-mono text-xs text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t.sync.offline}
            </span>
            <button type="button" onClick={onSyncNow} className="btn-ghost text-xs">
              <RefreshCw size={14} /> {t.sync.retry}
            </button>
          </div>
        ) : syncProfile ? (
          <div className="flex flex-wrap items-center gap-3">
            <ProfileAvatar avatarUrl={syncProfile.avatarUrl} name={syncProfile.name} />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-fg">{syncProfile.name}</span>
            {syncPending ? (
              <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-mono text-[11px] text-muted">{t.sync.pending}</span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] text-accent">
                <Check size={12} /> {t.sync.synced}
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              <button type="button" onClick={onSyncNow} className="btn-ghost text-xs" title={t.sync.syncNow}>
                <RefreshCw size={14} /> {t.sync.syncNow}
              </button>
              <button type="button" onClick={onSyncLogout} className="btn-ghost text-xs">
                <LogOut size={14} /> {t.sync.logout}
              </button>
            </span>
          </div>
        ) : null}
        {syncStatus === 'synced' && syncLastSyncAt != null && (
          <p className="mt-3 font-mono text-[10px] text-muted">
            {t.sync.lastSync(new Date(syncLastSyncAt))}
          </p>
        )}
      </div>

      <div className="card p-6">
        {/* Language Selection */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between font-mono">
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
      </div>

      <div className="card p-6">
        {/* Dark / Light Color Mode Switcher */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between font-mono">
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
        <div className="my-6 border-t border-line/50" />

        {/* Accent Color Switcher */}
        {(() => {
          const currentAccentOption =
            ACCENT_OPTIONS.find((o) => o.id === (settings.accentColor || 'red')) || ACCENT_OPTIONS[0]
          return (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between font-mono">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{t.settings.accentColor}</h3>
                  <span className="font-mono text-[10px] text-accent tracking-wider uppercase">
                    // {t.settings[currentAccentOption.labelKey]}
                  </span>
                </div>
                <p className="text-[11px] text-muted">{t.settings.accentColorHint}</p>
              </div>

              {/* Clean Single-Row Tactile Swatches - Never wraps */}
              <div
                role="radiogroup"
                aria-label={t.settings.accentColor}
                className="inline-flex items-center gap-2 p-1.5 rounded-full border border-line bg-canvas select-none shrink-0 self-start sm:self-auto"
              >
                {ACCENT_OPTIONS.map((opt) => {
                  const active = (settings.accentColor || 'red') === opt.id
                  const swatchColor =
                    opt.id === 'monochrome'
                      ? colorMode === 'light'
                        ? '#1E1E1E'
                        : '#FFFFFF'
                      : opt.colorHex

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      title={t.settings[opt.labelKey]}
                      onClick={() => {
                        playMicroClick('toggle')
                        document.documentElement.dataset.accent = opt.id
                        update((s) => ({ ...s, accentColor: opt.id }))
                      }}
                      className={`group relative h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        active
                          ? 'ring-2 ring-fg ring-offset-2 ring-offset-canvas scale-110'
                          : 'opacity-65 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatchColor }}
                    >
                      {active && (
                        <Check
                          size={13}
                          strokeWidth={3}
                          className={
                            opt.id === 'monochrome' && colorMode !== 'light'
                              ? 'text-black'
                              : 'text-white'
                          }
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      <div className="card p-6">
        <h3 className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-muted">{t.settings.timerIntervals}</h3>
        <p className="mb-5 font-mono text-[11px] text-muted">{t.settings.timerIntervalsHint}</p>

        {/* Quick Presets */}
        <div className="mb-6">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            {t.settings.presets}
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active =
                settings.phases.focus === p.focus &&
                settings.phases.shortBreak === p.shortBreak &&
                settings.phases.longBreak === p.longBreak
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      phases: {
                        ...s.phases,
                        focus: p.focus,
                        shortBreak: p.shortBreak,
                        longBreak: p.longBreak,
                      },
                    }))
                  }
                  className={`rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors active:scale-95 ${
                    active
                      ? 'border-fg bg-fg text-canvas font-bold'
                      : 'border-line bg-surface text-muted hover:border-fg/50 hover:text-fg'
                  }`}
                >
                  {t.settings[p.labelKey]}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3-Column Phases Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{t.phases.focus}</span>
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
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{t.phases.shortBreak}</span>
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
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{t.phases.longBreak}</span>
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
        <div className="my-6 border-t border-line/50" />

        {/* Cycle, Daily Goal & Weekly Goal in 3 Columns with Equalized Heights */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex flex-col justify-between gap-2">
            <div className="flex min-h-[38px] flex-col justify-center">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-fg">{t.settings.cycle}</span>
              <p className="font-mono text-[11px] text-muted line-clamp-1">{t.settings.cycleHint}</p>
            </div>
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
            <div className="h-4" /> {/* Height balancer */}
          </div>

          <div className="flex flex-col justify-between gap-2">
            <div className="flex min-h-[38px] flex-col justify-center">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-fg">{t.settings.dailyGoal}</span>
              <p className="font-mono text-[11px] text-muted line-clamp-1">{t.settings.dailyGoalHint}</p>
            </div>
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
            <div className="flex items-center justify-center">
              <span className="font-mono text-[11px] text-muted">
                {t.settings.dailyGoalHours(settings.dailyGoalMinutes / 60)}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-2">
            <div className="flex min-h-[38px] flex-col justify-center">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-fg">{t.settings.weeklyGoal}</span>
              <p className="font-mono text-[11px] text-muted line-clamp-1">{t.settings.weeklyGoalHint}</p>
            </div>
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
            <div className="flex items-center justify-center">
              <span className="font-mono text-[11px] text-muted">
                {t.settings.weeklyGoalHours(settings.weeklyGoalMinutes / 60)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-muted">{t.settings.tags}</h3>
            <p className="mt-1 font-mono text-[11px] text-muted">{t.settings.tagsHint}</p>
          </div>
          <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            {settings.tags.length} {settings.tags.length === 1 ? 'TAG' : 'TAGS'}
          </span>
        </div>

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
              // Drop the class as soon as the shake finishes so the next
              // trigger can re-apply it and replay the animation cleanly.
              if (e.animationName === 'shake') e.currentTarget.classList.remove('animate-shake')
            }}
            placeholder={t.settings.newTagPlaceholder}
            className={`w-full rounded-full border bg-canvas pl-4 pr-16 py-2 font-mono text-xs text-fg placeholder:text-muted/60 transition-colors focus:outline-none ${
              tagError ? 'border-accent ring-1 ring-accent/40' : 'border-line focus:border-fg'
            }`}
            maxLength={30}
          />
          <div className="absolute right-1.5 flex items-center gap-1.5">
            <kbd className="hidden select-none rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted/60 sm:inline-block">
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
                <Plus size={15} />
              </span>
            </button>
          </div>
        </div>

        {tagError && (
          <p key={errorNonce} className="mt-1.5 font-mono text-xs text-accent animate-fade-in">
            {tagError}
          </p>
        )}

        {/* Tag Chips Flex-Wrap List */}
        {settings.tags.length === 0 ? (
          <p className="mt-3 font-mono text-xs italic text-muted">{t.settings.noTagsYet}</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {settings.tags.map((tag) => {
              const tagColor = getTagColor(tag)
              return (
                <span
                  key={tag}
                  className="group inline-flex animate-chip-in items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 font-mono text-xs font-medium text-fg transition-colors hover:border-fg/40 select-none"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: tagColor,
                      boxShadow: `0 0 8px ${tagColor}66`,
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
      </div>

      <div className="card p-6">
        <h3 className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-muted">{t.settings.data}</h3>
        <p className="mb-4 font-mono text-[11px] text-muted">{t.settings.dataHint}</p>

        {/* Primary Backup Action (Full Width) */}
        <button
          type="button"
          onClick={handleBackup}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-fg transition-colors hover:border-fg/50 hover:bg-surface-raised active:scale-[0.98]"
        >
          <Download size={15} className="text-accent" />
          <span>{t.settings.backup}</span>
        </button>

        {/* Granular Exports (Symmetrical 2x2 Grid) */}
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSessionsCsv}
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-full border border-transparent hover:border-line hover:bg-surface px-3 py-2 font-mono text-xs uppercase tracking-wider"
            title={t.dashboard.sessionsCsvTitle}
          >
            <FileDown size={14} className="text-muted" />
            <span>{t.dashboard.sessionsCsv}</span>
          </button>
          <button
            type="button"
            onClick={handleSessionsJson}
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-full border border-transparent hover:border-line hover:bg-surface px-3 py-2 font-mono text-xs uppercase tracking-wider"
            title={t.dashboard.sessionsJsonTitle}
          >
            <FileJson size={14} className="text-muted" />
            <span>{t.dashboard.sessionsJson}</span>
          </button>
          <button
            type="button"
            onClick={handleTodosCsv}
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-full border border-transparent hover:border-line hover:bg-surface px-3 py-2 font-mono text-xs uppercase tracking-wider"
            title={t.dashboard.todosCsvTitle}
          >
            <FileDown size={14} className="text-muted" />
            <span>{t.dashboard.todosCsv}</span>
          </button>
          <button
            type="button"
            onClick={handleTodosJson}
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-full border border-transparent hover:border-line hover:bg-surface px-3 py-2 font-mono text-xs uppercase tracking-wider"
            title={t.dashboard.todosJsonTitle}
          >
            <FileJson size={14} className="text-muted" />
            <span>{t.dashboard.todosJson}</span>
          </button>
        </div>

        {/* Destructive Section (Danger Zone) */}
        <div className="mt-6 border-t border-line/50 pt-4">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t.settings.confirmClear)) void clearSessions()
            }}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20 hover:border-accent active:scale-[0.98]"
          >
            <Trash2 size={14} />
            <span>{t.settings.clearSessions}</span>
          </button>
        </div>
      </div>
    </div>
  )
})