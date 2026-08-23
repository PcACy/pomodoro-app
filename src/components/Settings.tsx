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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted transition-all hover:bg-raised hover:text-fg active:scale-90 disabled:pointer-events-none disabled:opacity-25"
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
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
      setShake(true)
      setTimeout(() => setShake(false), 400)
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

          <div className="relative grid grid-cols-2 w-full sm:w-56 items-center gap-1 rounded-btn border border-line/60 bg-canvas/80 p-1 backdrop-blur-md">
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-btn bg-raised shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                width: 'calc((100% - 8px - 4px) / 2)',
                left: '4px',
                transform: `translateX(calc(${lang === 'de' ? 0 : 1} * (100% + 4px)))`,
              }}
            />
            <button
              type="button"
              onClick={() => setLang('de')}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium transition-colors duration-200 active:scale-95 cursor-pointer ${
                lang === 'de' ? 'text-fg font-semibold' : 'text-muted hover:text-fg'
              }`}
            >
              <span className="font-mono text-[10px] font-bold tracking-wider opacity-60">DE</span>
              <span>Deutsch</span>
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium transition-colors duration-200 active:scale-95 cursor-pointer ${
                lang === 'en' ? 'text-fg font-semibold' : 'text-muted hover:text-fg'
              }`}
            >
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
          <div className="relative grid grid-cols-2 w-full sm:w-56 items-center gap-1 rounded-btn border border-line/60 bg-canvas/80 p-1 backdrop-blur-md">
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-btn bg-raised shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                width: 'calc((100% - 8px - 4px) / 2)',
                left: '4px',
                transform: `translateX(calc(${colorMode === 'dark' ? 0 : 1} * (100% + 4px)))`,
              }}
            />
            <button
              type="button"
              onClick={() => onColorModeChange('dark')}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-btn px-3 py-1.5 text-xs font-medium transition-colors duration-200 active:scale-95 ${
                colorMode === 'dark' ? 'text-fg font-semibold' : 'text-muted hover:text-fg'
              }`}
            >
              <Moon size={14} />
              <span>{t.settings.dark}</span>
            </button>
            <button
              type="button"
              onClick={() => onColorModeChange('light')}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-btn px-3 py-1.5 text-xs font-medium transition-colors duration-200 active:scale-95 ${
                colorMode === 'light' ? 'text-fg font-semibold' : 'text-muted hover:text-fg'
              }`}
            >
              <Sun size={14} />
              <span>{t.settings.light}</span>
            </button>
          </div>
        </div>

        {/* Theme Families */}
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.theme}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.themeHint}</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {THEMES.map((theme) => {
            const swatches = colorMode === 'dark' ? theme.swatchDark : theme.swatchLight
            const isSelected = themeId === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onThemeChange(theme.id)}
                className={`flex items-center justify-between rounded-btn border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-accent bg-accent/10 shadow-sm shadow-accent/10'
                    : 'border-line bg-canvas hover:bg-raised'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex -space-x-1.5">
                    {swatches.map((c, i) => (
                      <span
                        key={i}
                        className="h-4 w-4 rounded-full border border-line/80 shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <span className="text-sm font-medium text-fg">{theme.label}</span>
                </div>
                {isSelected && <Check size={16} className="text-accent" />}
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
                ? 'border-accent bg-accent/10 shadow-sm shadow-accent/10 ring-1 ring-accent/30'
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
                <div className="h-4 w-4 rounded-full border border-line" />
              )}
            </div>

            {/* Wireframe Preview Graphic */}
            <div className="mb-3.5 flex h-24 w-full items-center justify-center overflow-hidden rounded-btn border border-line/60 bg-surface/80 p-3 shadow-inner">
              <div className="flex items-center gap-3.5">
                {/* Left Mini Dial */}
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent/60 bg-accent/10 shadow-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                </div>
                {/* Right Mini Task Bars */}
                <div className="flex flex-col gap-1.5">
                  <div className="h-2 w-14 rounded-full bg-fg/25" />
                  <div className="h-2 w-10 rounded-full bg-fg/15" />
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
                ? 'border-accent bg-accent/10 shadow-sm shadow-accent/10 ring-1 ring-accent/30'
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
                <div className="h-4 w-4 rounded-full border border-line" />
              )}
            </div>

            {/* Wireframe Preview Graphic */}
            <div className="mb-3.5 flex h-24 w-full items-center justify-center overflow-hidden rounded-btn border border-line/60 bg-surface/80 p-3 shadow-inner">
              <div className="flex flex-col items-center gap-1.5">
                {/* Centered Large Mini Dial */}
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-accent/60 bg-accent/10 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                </div>
                {/* Centered Mini Bar */}
                <div className="h-1.5 w-10 rounded-full bg-fg/20" />
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

        {/* Cycle & Weekly Goal in 2 Columns with Equalized Headers */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
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
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex min-h-[38px] flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-fg">{t.settings.weeklyGoal}</span>
                <span className="rounded-md border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  {t.settings.weeklyGoalHours(settings.weeklyGoalMinutes / 60)}
                </span>
              </div>
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
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder={t.settings.newTagPlaceholder}
            className={`w-full rounded-btn border bg-raised/50 px-3.5 py-2 pr-10 font-mono text-sm text-fg placeholder:text-muted transition-all focus:outline-none ${
              shake || tagError
                ? 'border-accent-strong ring-1 ring-accent-strong/40 animate-shake'
                : 'border-line focus:border-accent'
            }`}
            maxLength={30}
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!newTag.trim()}
            title={t.settings.addTag}
            aria-label={t.settings.addTag}
            className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-sm bg-accent text-on-accent transition-all hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <Plus size={16} />
          </button>
        </div>

        {tagError && (
          <p className="mt-1.5 text-xs font-medium text-accent-strong animate-fade-in">
            {tagError}
          </p>
        )}

        {/* Tag Chips Flex-Wrap List */}
        {settings.tags.length === 0 ? (
          <p className="mt-3 text-xs italic text-muted">{t.settings.noTagsYet}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.tags.map((tag) => {
              const color = getTagColor(tag)
              return (
                <span
                  key={tag}
                  className="tag-badge group flex items-center gap-1.5 rounded-badge border px-2.5 py-1 font-mono text-xs font-medium transition-all hover:brightness-105"
                  style={{
                    backgroundColor: `${color}18`,
                    color: color,
                    borderColor: `${color}40`,
                  }}
                >
                  <span className="tag-dot h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="max-w-[160px] truncate">{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="cursor-pointer rounded-sm p-0.5 text-current transition-colors hover:bg-black/10 dark:hover:bg-white/20"
                    title={t.settings.removeTag(tag)}
                    aria-label={t.settings.removeTag(tag)}
                  >
                    <X size={13} />
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="card border-accent-strong/40 p-6">
        <h3 className="mb-1 text-sm font-semibold text-accent-strong">{t.settings.data}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.dataHint}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleBackup} className="btn-ghost text-xs">
            <Download size={14} /> {t.settings.backup}
          </button>
          <button type="button" onClick={handleSessionsCsv} className="btn-ghost text-xs" title={t.dashboard.sessionsCsvTitle}>
            <FileDown size={14} /> {t.dashboard.sessionsCsv}
          </button>
          <button type="button" onClick={handleSessionsJson} className="btn-ghost text-xs" title={t.dashboard.sessionsJsonTitle}>
            <FileJson size={14} /> {t.dashboard.sessionsJson}
          </button>
          <button type="button" onClick={handleTodosCsv} className="btn-ghost text-xs" title={t.dashboard.todosCsvTitle}>
            <FileDown size={14} /> {t.dashboard.todosCsv}
          </button>
          <button type="button" onClick={handleTodosJson} className="btn-ghost text-xs" title={t.dashboard.todosJsonTitle}>
            <FileJson size={14} /> {t.dashboard.todosJson}
          </button>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t.settings.confirmClear)) void clearSessions()
            }}
            className="btn border border-accent-strong/60 bg-accent-strong/10 text-accent-strong hover:bg-accent-strong/20"
          >
            <Trash2 size={15} /> {t.settings.clearSessions}
          </button>
        </div>
      </div>
    </div>
  )
})