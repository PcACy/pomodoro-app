import { useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import type { Settings } from '../types'
import { THEMES, type ThemeId } from '../themes'
import { clearSessions } from '../lib/db'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  settings: Settings
  update: (updater: (s: Settings) => Settings) => void
  themeId: ThemeId
  onThemeChange: (id: ThemeId) => void
}

const PHASE_KEYS: Array<keyof Pick<Settings['phases'], 'focus' | 'shortBreak' | 'longBreak'>> = [
  'focus',
  'shortBreak',
  'longBreak',
]

export function SettingsPanel({ settings, update, themeId, onThemeChange }: Props) {
  const { t, lang, setLang } = useTranslation()
  const [newTag, setNewTag] = useState('')

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
    update((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }))
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
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
  )
}