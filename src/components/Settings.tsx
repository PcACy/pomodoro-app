import { memo, useState } from 'react'
import { Check, Download, FileDown, FileJson, Github, Loader2, LogOut, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import type { Settings, Session, TodoItem } from '../types'
import { THEMES, type ThemeId } from '../themes'
import { clearSessions, exportAll } from '../lib/db'
import { downloadText, sessionsToCsv, sessionsToJson, todosToCsv, todosToJson } from '../lib/dataExport'
import { useTranslation } from '../hooks/useTranslation'
import type { SyncStatus } from '../hooks/useSync'
import type { GitHubProfile } from '../hooks/useAuth'

interface Props {
  settings: Settings
  update: (updater: (s: Settings) => Settings) => void
  themeId: ThemeId
  onThemeChange: (id: ThemeId) => void
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

const PHASE_KEYS: Array<keyof Pick<Settings['phases'], 'focus' | 'shortBreak' | 'longBreak'>> = [
  'focus',
  'shortBreak',
  'longBreak',
]

export const SettingsPanel = memo(function SettingsPanel({
  settings,
  update,
  themeId,
  onThemeChange,
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
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.theme}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.themeHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onThemeChange(t.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                themeId === t.id
                  ? 'border-accent bg-accent/10'
                  : 'border-line bg-canvas hover:bg-raised'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex -space-x-1.5">
                  {t.swatch.map((c, i) => (
                    <span
                      key={i}
                      className="h-4 w-4 rounded-full border border-line"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span className="text-sm font-medium text-fg">{t.label}</span>
              </div>
              {themeId === t.id && <Check size={16} className="text-accent" />}
            </button>
          ))}
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
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.phases}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.phasesHint}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {PHASE_KEYS.map((key) => (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">{t.phases[key]}</span>
              <input
                type="number"
                min={1}
                max={180}
                value={settings.phases[key]}
                onChange={(e) => setPhaseDuration(key, Number(e.target.value))}
                className="input font-mono"
              />
              <span className="text-[10px] text-muted">{t.settings.minutes}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.cycle}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.cycleHint}</p>
        <input
          type="number"
          min={1}
          max={12}
          value={settings.phases.roundsBeforeLongBreak}
          onChange={(e) =>
            update((s) => ({
              ...s,
              phases: { ...s.phases, roundsBeforeLongBreak: Math.max(1, Math.min(12, Number(e.target.value) || 1)) },
            }))
          }
          className="input w-32 font-mono"
        />
      </div>

      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold text-fg">{t.settings.weeklyGoal}</h3>
        <p className="mb-4 text-xs text-muted">{t.settings.weeklyGoalHint}</p>
        <input
          type="number"
          min={1}
          max={24 * 60}
          value={settings.weeklyGoalMinutes}
          onChange={(e) =>
            update((s) => ({
              ...s,
              weeklyGoalMinutes: Math.max(1, Math.min(24 * 60, Number(e.target.value) || 1)),
            }))
          }
          className="input w-40 font-mono"
        />
        <span className="ml-2 text-xs text-muted">{t.settings.minutes}</span>
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