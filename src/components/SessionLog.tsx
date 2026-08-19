import { useMemo, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import type { Session } from '../types'
import { fmtDateTime, fmtDuration } from '../lib/time'

interface Props {
  sessions: Session[]
  onClear: () => void
}

export function SessionLog({ sessions, onClear }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) =>
      [s.task, s.tag, fmtDateTime(new Date(s.start))]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [sessions, query])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sessions durchsuchen (Name, Tag, Datum) …"
            className="input pl-9"
          />
        </div>
        <button type="button" onClick={onClear} className="btn-ghost text-xs" title="Alle löschen">
          <Trash2 size={15} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          {sessions.length === 0 ? 'Noch keine Sessions erfasst.' : 'Keine Treffer.'}
        </p>
      ) : (
        <ul className="max-h-80 divide-y divide-zinc-800 overflow-y-auto">
          {filtered.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-zinc-200">{s.task || 'Ohne Aufgabe'}</span>
                <span className="text-xs text-zinc-500">{fmtDateTime(new Date(s.start))}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                  {s.tag || '—'}
                </span>
                <span className="w-16 text-right font-mono text-xs tabular-nums text-rose-300">
                  {fmtDuration(s.durationMs)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}