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
import type { Settings, Session, TodoItem } from '../types'
import { THEMES, type ColorMode, type ThemeId } from '../themes'
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-all hover:bg-raised hover:text-fg active:scale-90 disabled:pointer-events-none disabled:opacity-25"
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
      className={`flex items-center justify-between rounded-xl border border-line bg-canvas/80 p-1 transition-colors focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/40 ${className}`}
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
  const [newTag, setNewTag] = useState('')

  const todayKey = new Date().toISOString().slice(0, 10)

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
    const t = newTag.trim()
    if (!t || settings.tags.includes(t)) return
    update((s) => ({ ...s, tags: [...s.tags, t] }))
    setNewTag('')
  }

  const removeTag = (tag: string) => {
    if (settings.tags.length <= 1) return
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
            {syncProfile.avatarUrl ? (
              <img
                src={syncProfile.avatarUrl}
                alt={syncProfile.name}
                className="h-8 w-8 rounded-full border border-line"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-raised text-xs font-bold text-fg">
                {syncProfile.name.slice(0, 1).toUpperCase()}
              </span>
            )}
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
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.language}</h3>
        <div className="flex gap-2">
          {(['de', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                lang === l ? 'border-accent bg-accent/10 text-fg' : 'border-line bg-canvas text-muted hover:bg-raised'
              }`}
            >
              {l === 'de' ? 'Deutsch 🇩🇪' : 'English 🇬🇧'}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6">
        {/* Dark / Light Color Mode Switcher */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/50 pb-5">
          <div>
            <h3 className="text-sm font-semibold text-fg">{t.settings.colorMode}</h3>
            <p className="text-xs text-muted">{t.settings.colorModeHint}</p>
          </div>
          <div className="relative grid grid-cols-2 w-full sm:w-56 items-center gap-1 rounded-xl border border-line/60 bg-canvas/80 p-1 backdrop-blur-md">
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-lg bg-raised shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{
                width: 'calc((100% - 8px - 4px) / 2)',
                left: '4px',
                transform: `translateX(calc(${colorMode === 'dark' ? 0 : 1} * (100% + 4px)))`,
              }}
            />
            <button
              type="button"
              onClick={() => onColorModeChange('dark')}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 active:scale-95 ${
                colorMode === 'dark' ? 'text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              <Moon size={14} />
              <span>{t.settings.dark}</span>
            </button>
            <button
              type="button"
              onClick={() => onColorModeChange('light')}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 active:scale-95 ${
                colorMode === 'light' ? 'text-fg' : 'text-muted hover:text-fg'
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
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
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
        <div className="grid gap-2 sm:grid-cols-2">
          {(['split', 'single'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update((s) => ({ ...s, layoutMode: m }))}
              className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-colors ${
                settings.layoutMode === m ? 'border-accent bg-accent/10' : 'border-line bg-canvas hover:bg-raised'
              }`}
            >
              <span className="text-sm font-medium text-fg">
                {m === 'split' ? t.settings.layoutSplit : t.settings.layoutSingle}
              </span>
              {settings.layoutMode === m && <Check size={16} className="shrink-0 text-accent" />}
            </button>
          ))}
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
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
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
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder={t.settings.newTag}
            className="input max-w-xs"
            maxLength={30}
          />
          <button type="button" onClick={addTag} className="btn-primary">
            <Plus size={15} /> {t.settings.addTag}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {settings.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1 text-xs text-fg"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-muted transition-colors hover:text-accent"
                title={t.settings.removeTag(tag)}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
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