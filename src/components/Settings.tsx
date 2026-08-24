import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  Download,
  FileDown,
  FileJson,
  Github,
  Languages,
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
import { THEMES, type ColorMode, type ThemeId } from '../themes'
import { useThemeColors } from '../hooks/useTheme'
import { clearSessions, exportAll } from '../lib/db'
import { downloadText, sessionsToCsv, sessionsToJson, todosToCsv, todosToJson } from '../lib/dataExport'
import { useTranslation } from '../hooks/useTranslation'
import type { SyncStatus } from '../hooks/useSync'
import type { GitHubProfile } from '../hooks/useAuth'

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
      className="tap-spring flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-muted hover:bg-raised hover:text-fg disabled:pointer-events-none disabled:opacity-25"
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
    const parsed = Number(raw)
    if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
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
        onChange(parsed)
      }
      setLocalStr(null)
    }
  }

  const displayVal = localStr !== null ? localStr : String(value)

  return (
    <div
      className={`flex items-center justify-between rounded-btn border border-line bg-canvas/80 p-1 transition-colors focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/40 ${className}`}
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
  onThemeChange: (id: ThemeId) => void
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
  themeId,
  colorMode,
  onThemeChange,
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
  const colors = useThemeColors(themeId, colorMode)
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

  const todayKey = new Date().toISOString().slice(0, 10)

  const getTagColor = useCallback(
    (tag: string): string => {
      let hash = 0
      for (let i = 0; i < tag.length; i++) {
        hash = (hash << 5) - hash + tag.charCodeAt(i)
        hash |= 0
      }
      const index = Math.abs(hash) % colors.chart.length
      return colors.chart[index]
    },
    [colors.chart],
  )

  /** "rgb(254 128 25)" -> "254 128 25" so chips can use alpha variants. */
  const tagRgbTriplet = useCallback(
    (tag: string): string => {
      const parts = getTagColor(tag).match(/[\d.]+/g)
      return parts && parts.length >= 3 ? `${parts[0]} ${parts[1]} ${parts[2]}` : '128 128 128'
    },
    [getTagColor],
  )

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
    const v = Math.max(1, Math.min(180, value || 1))
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
    update((s) => ({ ...s, tags: [...s.tags, trimmed] }))
    setNewTag('')
    setTagError(null)
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    update((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }))
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.sync.title}</h3>
        <p className="mb-4 text-xs text-muted">{t.sync.hint}</p>

        {!syncAvailable ? (
          <p className="text-xs text-muted">{t.sync.notConfigured}</p>
        ) : syncStatus === 'signed-out' ? (
          <button type="button" onClick={onSyncLogin} className="btn-primary">
            <Github size={15} /> {t.sync.login}
          </button>
        ) : syncStatus === 'syncing' || syncLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={15} className="animate-spin" />
            {t.sync.syncing}
          </div>
        ) : syncStatus === 'offline' || syncStatus === 'error' ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-accent-strong">
              <span className="h-2 w-2 rounded-full bg-accent-strong" />
              {t.sync.offline}
            </span>
            <button type="button" onClick={onSyncNow} className="btn-ghost text-xs">
              <RefreshCw size={14} /> {t.sync.retry}
            </button>
          </div>
        ) : syncProfile ? (
          <div className="flex flex-wrap items-center gap-3">
            <ProfileAvatar avatarUrl={syncProfile.avatarUrl} name={syncProfile.name} />
            <span className="text-sm font-medium text-fg">{syncProfile.name}</span>
            {syncPending ? (
              <span className="rounded-full bg-raised px-2.5 py-1 text-xs text-muted">{t.sync.pending}</span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent">
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
          <p className="mt-3 text-[10px] text-muted">
            {t.sync.lastSync(new Date(syncLastSyncAt))}
          </p>
        )}
      </div>

      <div className="card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-accent/10 text-accent">
              <Languages size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fg">{t.settings.language}</h3>
              <p className="text-xs text-muted">{t.settings.languageHint}</p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label={t.settings.language}
            className="seg-track relative grid grid-cols-2 w-full sm:w-56 items-center gap-1 select-none rounded-btn border border-line/70 bg-surface/80 p-1 backdrop-blur-md"
          >
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-[calc(var(--radius-btn)-4px)] bg-raised shadow-sm ios-seg-active transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                width: 'calc((100% - 8px - 4px) / 2)',
                left: '4px',
                transform: `translateX(calc(${lang === 'de' ? 0 : 1} * (100% + 4px)))`,
              }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={lang === 'de'}
              onClick={() => setLang('de')}
              className={`relative z-10 flex min-h-[36px] sm:min-h-[38px] items-center justify-center gap-1.5 rounded-[calc(var(--radius-btn)-4px)] px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 active:scale-[0.98] cursor-pointer ${
                lang === 'de' ? 'text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {lang === 'de' && (
                <Check size={13} className="m3-seg-check hidden animate-fade-in stroke-[2.5]" />
              )}
              <span className="font-mono text-[10px] font-bold tracking-wider opacity-60">DE</span>
              <span>Deutsch</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lang === 'en'}
              onClick={() => setLang('en')}
              className={`relative z-10 flex min-h-[36px] sm:min-h-[38px] items-center justify-center gap-1.5 rounded-[calc(var(--radius-btn)-4px)] px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 active:scale-[0.98] cursor-pointer ${
                lang === 'en' ? 'text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {lang === 'en' && (
                <Check size={13} className="m3-seg-check hidden animate-fade-in stroke-[2.5]" />
              )}
              <span className="font-mono text-[10px] font-bold tracking-wider opacity-60">EN</span>
              <span>English</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        {/* Dark / Light Color Mode Switcher */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/50 pb-5">
          <div>
            <h3 className="text-sm font-semibold text-fg">{t.settings.colorMode}</h3>
            <p className="text-xs text-muted">{t.settings.colorModeHint}</p>
          </div>
          <div
            role="tablist"
            aria-label={t.settings.colorMode}
            className="seg-track relative grid grid-cols-2 w-full sm:w-56 items-center gap-1 select-none rounded-btn border border-line/70 bg-surface/80 p-1 backdrop-blur-md"
          >
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-[calc(var(--radius-btn)-4px)] bg-raised shadow-sm ios-seg-active transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                width: 'calc((100% - 8px - 4px) / 2)',
                left: '4px',
                transform: `translateX(calc(${colorMode === 'dark' ? 0 : 1} * (100% + 4px)))`,
              }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={colorMode === 'dark'}
              onClick={() => onColorModeChange('dark')}
              className={`relative z-10 flex min-h-[36px] sm:min-h-[38px] items-center justify-center gap-2 rounded-[calc(var(--radius-btn)-4px)] px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 active:scale-[0.98] cursor-pointer ${
                colorMode === 'dark' ? 'text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {colorMode === 'dark' && (
                <Check size={13} className="m3-seg-check hidden animate-fade-in stroke-[2.5]" />
              )}
              <Moon size={14} />
              <span>{t.settings.dark}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={colorMode === 'light'}
              onClick={() => onColorModeChange('light')}
              className={`relative z-10 flex min-h-[36px] sm:min-h-[38px] items-center justify-center gap-2 rounded-[calc(var(--radius-btn)-4px)] px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 active:scale-[0.98] cursor-pointer ${
                colorMode === 'light' ? 'text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {colorMode === 'light' && (
                <Check size={13} className="m3-seg-check hidden animate-fade-in stroke-[2.5]" />
              )}
              <Sun size={14} />
              <span>{t.settings.light}</span>
            </button>
          </div>
        </div>

        {/* Theme Families */}
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.theme}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.themeHint}</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {THEMES.map((theme) => {
            const swatches = colorMode === 'dark' ? theme.swatchDark : theme.swatchLight
            const isSelected = themeId === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onThemeChange(theme.id)}
                className={`group relative flex flex-col justify-between rounded-card border p-3.5 text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-accent bg-accent/10 shadow-sm shadow-accent/15 ring-1 ring-accent/30'
                    : 'border-line/70 bg-canvas/80 hover:border-line hover:bg-raised/60'
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex -space-x-1.5">
                    {swatches.map((c, i) => (
                      <span
                        key={i}
                        className="h-4 w-4 rounded-full border border-line/80 shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <div className="flex h-5 w-5 items-center justify-center">
                    {isSelected ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-line/70" />
                    )}
                  </div>
                </div>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-fg tracking-tight">{theme.label}</span>
                  <span className="text-[10px] text-text-muted mt-0.5">{theme.subtitle}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.appearance}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.layoutHint}</p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Two Columns (split) */}
          <button
            type="button"
            onClick={() => update((s) => ({ ...s, layoutMode: 'split' }))}
            className={`group relative flex flex-col rounded-card border p-4 text-left transition-all active:scale-[0.98] ${
              settings.layoutMode === 'split'
                ? 'border-accent bg-accent/10 shadow-sm shadow-accent/15 ring-1 ring-accent/30'
                : 'border-line/70 bg-canvas/80 hover:border-line hover:bg-raised/60'
            }`}
          >
            {/* Selection indicator pill */}
            <div className="absolute right-3.5 top-3.5 z-10 flex h-5 w-5 items-center justify-center">
              {settings.layoutMode === 'split' ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full border border-line/70" />
              )}
            </div>

            {/* Wireframe Preview Graphic */}
            <div className="mb-3.5 flex h-24 sm:h-28 w-full items-center justify-center overflow-hidden rounded-btn border border-line/70 bg-raised/40 p-3 shadow-inner">
              <div className="flex items-center gap-4">
                {/* Left Column: Mini Dial */}
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent/15 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                </div>
                {/* Right Column: Mini Task & Stats Bars */}
                <div className="flex flex-col gap-2">
                  <div className="h-2 w-16 rounded-full border border-fg/20 bg-fg/25" />
                  <div className="h-2 w-12 rounded-full border border-fg/15 bg-fg/15" />
                  <div className="h-1.5 w-14 rounded-full border border-accent/40 bg-accent/20" />
                </div>
              </div>
            </div>

            {/* Typography & Labels */}
            <div className="pr-6">
              <span className="text-sm font-semibold text-fg">
                {t.settings.layoutTwoColumns}
              </span>
              <p className="mt-0.5 text-xs text-muted leading-relaxed">
                {t.settings.layoutTwoColumnsDesc}
              </p>
            </div>
          </button>

          {/* Single Column (single) */}
          <button
            type="button"
            onClick={() => update((s) => ({ ...s, layoutMode: 'single' }))}
            className={`group relative flex flex-col rounded-card border p-4 text-left transition-all active:scale-[0.98] ${
              settings.layoutMode === 'single'
                ? 'border-accent bg-accent/10 shadow-sm shadow-accent/15 ring-1 ring-accent/30'
                : 'border-line/70 bg-canvas/80 hover:border-line hover:bg-raised/60'
            }`}
          >
            {/* Selection indicator pill */}
            <div className="absolute right-3.5 top-3.5 z-10 flex h-5 w-5 items-center justify-center">
              {settings.layoutMode === 'single' ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full border border-line/70" />
              )}
            </div>

            {/* Wireframe Preview Graphic */}
            <div className="mb-3.5 flex h-24 sm:h-28 w-full items-center justify-center overflow-hidden rounded-btn border border-line/70 bg-raised/40 p-3 shadow-inner">
              <div className="flex flex-col items-center gap-2">
                {/* Centered Large Mini Dial */}
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent/15 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                </div>
                {/* Centered Mini Task Bars */}
                <div className="h-2 w-14 rounded-full border border-fg/20 bg-fg/25" />
                <div className="h-1.5 w-10 rounded-full border border-fg/15 bg-fg/15" />
              </div>
            </div>

            {/* Typography & Labels */}
            <div className="pr-6">
              <span className="text-sm font-semibold text-fg">
                {t.settings.layoutOneColumn}
              </span>
              <p className="mt-0.5 text-xs text-muted leading-relaxed">
                {t.settings.layoutOneColumnDesc}
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.timerIntervals}</h3>
        <p className="mb-5 text-xs text-muted">{t.settings.timerIntervalsHint}</p>

        {/* Quick Presets */}
        <div className="mb-6">
          <div className="mb-2 text-xs font-medium text-muted">
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
                  className={`rounded-btn border px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    active
                      ? 'border-accent bg-accent/15 text-accent shadow-sm shadow-accent/10 font-semibold'
                      : 'border-line bg-canvas/80 text-muted hover:border-line hover:bg-raised hover:text-fg'
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
            <span className="text-xs font-medium text-muted">{t.phases.focus}</span>
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
            <span className="text-xs font-medium text-muted">{t.phases.shortBreak}</span>
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
            <span className="text-xs font-medium text-muted">{t.phases.longBreak}</span>
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

        {/* Cycle & Weekly Goal in 2 Columns with Equalized Heights */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col justify-between gap-2">
            <div className="flex min-h-[38px] flex-col justify-center">
              <span className="text-xs font-semibold text-fg">{t.settings.cycle}</span>
              <p className="text-[11px] text-muted line-clamp-1">{t.settings.cycleHint}</p>
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
              <span className="text-xs font-semibold text-fg">{t.settings.weeklyGoal}</span>
              <p className="text-[11px] text-muted line-clamp-1">{t.settings.weeklyGoalHint}</p>
            </div>
            <NumberStepper
              value={settings.weeklyGoalMinutes}
              min={15}
              max={24 * 60}
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
              <span className="text-[11px] font-medium text-muted">
                {t.settings.weeklyGoalHours(settings.weeklyGoalMinutes / 60)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.tags}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.tagsHint}</p>

        {/* Integrated Single-Line Input Row */}
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
            className={`w-full rounded-btn border bg-raised/50 px-3.5 py-2 pr-10 font-mono text-sm text-fg placeholder:text-muted transition-colors focus:outline-none ${
              tagError ? 'border-accent-strong ring-1 ring-accent-strong/40' : 'border-line focus:border-accent'
            }`}
            maxLength={30}
          />
          <button
            type="button"
            onClick={() => {
              if (canAdd) addTag()
            }}
            aria-disabled={!canAdd}
            tabIndex={canAdd ? 0 : -1}
            title={t.settings.addTag}
            aria-label={t.settings.addTag}
            className={`absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-sm transition-all duration-150 ${
              canAdd
                ? 'cursor-pointer bg-accent text-on-accent opacity-100 shadow-sm hover:opacity-90 active:scale-95'
                : 'pointer-events-none cursor-not-allowed bg-transparent text-muted opacity-30'
            }`}
          >
            <span key={popNonce} className={`flex ${canAdd ? 'animate-add-pop' : ''}`}>
              <Plus size={16} />
            </span>
          </button>
        </div>

        {tagError && (
          <p key={errorNonce} className="mt-1.5 text-xs font-medium text-accent-strong animate-fade-in">
            {tagError}
          </p>
        )}

        {/* Tag Chips Flex-Wrap List */}
        {settings.tags.length === 0 ? (
          <p className="mt-3 text-xs italic text-muted">{t.settings.noTagsYet}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.tags.map((tag) => {
              const chipRgb = tagRgbTriplet(tag)
              const chipVars = { '--chip-rgb': chipRgb } as React.CSSProperties
              return (
                <span
                  key={tag}
                  className="tag-badge tag-chip-tonal group inline-flex animate-chip-in items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-medium"
                  style={chipVars}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `rgb(${chipRgb})` }}
                  />
                  <span className="max-w-[160px] truncate">{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="tag-chip-remove flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full"
                    style={chipVars}
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
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.data}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.dataHint}</p>

        {/* Primary Backup Action (Full Width) */}
        <button
          type="button"
          onClick={handleBackup}
          className="flex w-full items-center justify-center gap-2 rounded-btn border border-line/80 bg-raised/60 px-4 py-2.5 text-sm font-medium text-fg shadow-sm transition-all hover:border-muted/40 hover:bg-raised active:scale-[0.98]"
        >
          <Download size={16} className="text-accent" />
          <span>{t.settings.backup}</span>
        </button>

        {/* Granular Exports (Symmetrical 2x2 Grid) */}
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSessionsCsv}
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-btn px-3 py-2 text-xs"
            title={t.dashboard.sessionsCsvTitle}
          >
            <FileDown size={14} className="text-muted" />
            <span>{t.dashboard.sessionsCsv}</span>
          </button>
          <button
            type="button"
            onClick={handleSessionsJson}
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-btn px-3 py-2 text-xs"
            title={t.dashboard.sessionsJsonTitle}
          >
            <FileJson size={14} className="text-muted" />
            <span>{t.dashboard.sessionsJson}</span>
          </button>
          <button
            type="button"
            onClick={handleTodosCsv}
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-btn px-3 py-2 text-xs"
            title={t.dashboard.todosCsvTitle}
          >
            <FileDown size={14} className="text-muted" />
            <span>{t.dashboard.todosCsv}</span>
          </button>
          <button
            type="button"
            onClick={handleTodosJson}
            className="btn-ghost flex w-full items-center justify-center gap-2 rounded-btn px-3 py-2 text-xs"
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
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-btn border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs sm:text-sm font-medium text-red-400/90 transition-all hover:bg-red-500/20 hover:border-red-500/60 active:scale-[0.98]"
          >
            <Trash2 size={15} />
            <span>{t.settings.clearSessions}</span>
          </button>
        </div>
      </div>
    </div>
  )
})