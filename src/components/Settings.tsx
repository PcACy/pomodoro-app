import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { Settings } from '../types'
import { clearSessions } from '../lib/db'

interface Props {
  settings: Settings
  update: (updater: (s: Settings) => Settings) => void
}

const DURATION_FIELDS: { key: keyof Settings['phases']; label: string; hint: string }[] = [
  { key: 'focus', label: 'Fokus', hint: 'Minuten' },
  { key: 'shortBreak', label: 'Kurze Pause', hint: 'Minuten' },
  { key: 'longBreak', label: 'Lange Pause', hint: 'Minuten' },
]

export function SettingsPanel({ settings, update }: Props) {
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
        <h3 className="mb-1 text-sm font-semibold text-zinc-200">Phasen</h3>
        <p className="mb-4 text-xs text-zinc-500">Dauern in Minuten, zwischen 1 und 180.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {DURATION_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400">{f.label}</span>
              <input
                type="number"
                min={1}
                max={180}
                value={settings.phases[f.key]}
                onChange={(e) => setPhaseDuration(f.key, Number(e.target.value))}
                className="input font-mono"
              />
              <span className="text-[10px] text-zinc-600">{f.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold text-zinc-200">Zyklus</h3>
        <p className="mb-4 text-xs text-zinc-500">Nach wie vielen Fokus-Runden folgt eine lange Pause?</p>
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
        <h3 className="mb-1 text-sm font-semibold text-zinc-200">Wochenziel</h3>
        <p className="mb-4 text-xs text-zinc-500">Ziel-Fokuszeit pro Woche.</p>
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
        <span className="ml-2 text-xs text-zinc-500">Minuten</span>
      </div>

      <div className="card p-6">
        <h3 className="mb-1 text-sm font-semibold text-zinc-200">Tags</h3>
        <p className="mb-4 text-xs text-zinc-500">Kategorien für die Aufgaben-Zuweisung.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Neuer Tag …"
            className="input max-w-xs"
            maxLength={30}
          />
          <button type="button" onClick={addTag} className="btn-primary">
            <Plus size={15} /> Hinzufügen
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {settings.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-zinc-500 transition-colors hover:text-rose-400"
                title={`Tag "${tag}" entfernen`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="card border-red-900/40 p-6">
        <h3 className="mb-1 text-sm font-semibold text-red-400">Daten</h3>
        <p className="mb-4 text-xs text-zinc-500">
          Alle erfassten Sessions unwiderruflich löschen. Vorher ein Backup exportieren.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Wirklich ALLE Sessions löschen?')) void clearSessions()
          }}
          className="btn border border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-900/40"
        >
          <Trash2 size={15} /> Sessions löschen
        </button>
      </div>
    </div>
  )
}