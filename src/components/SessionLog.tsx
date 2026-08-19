import { useMemo, useState } from 'react'
import { Search, StickyNote, Trash2 } from 'lucide-react'
import type { Session } from '../types'
import { fmtDateTime, fmtDuration } from '../lib/time'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  sessions: Session[]
  onClear: () => void
}

function SessionRow({ s, locale }: { s: Session; locale: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const hasNote = Boolean(s.notes?.trim())

  return (
    <li className="py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-fg">{s.task || t.sessionLog.noTask}</span>
          <span className="text-xs text-muted">{fmtDateTime(new Date(s.start), locale)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasNote && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              title={open ? 'Notiz ausblenden' : 'Notiz anzeigen'}
              className={`rounded-md border p-1.5 transition-colors ${
                open
                  ? 'border-accent/60 bg-accent/10 text-accent'
                  : 'border-line text-muted hover:bg-raised hover:text-fg'
              }`}
            >
              <StickyNote size={14} />
            </button>
          )}
          <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-medium text-fg">
            {s.tag || '—'}
          </span>
          <span className="w-16 text-right font-mono text-xs tabular-nums text-accent">
            {fmtDuration(s.durationMs, locale === 'de-DE' ? 'de' : 'en')}
          </span>
        </div>
      </div>
      {open && s.notes && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-canvas px-3 py-2 text-xs leading-relaxed text-fg">
          {s.notes}
        </p>
      )}
    </li>
  )
}

export function SessionLog({ sessions, onClear }: Props) {
  const { t, lang } = useTranslation()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) =>
      [s.task, s.tag, fmtDateTime(new Date(s.start), locale)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [sessions, query, locale])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.sessionLog.searchPlaceholder}
            className="input pl-9"
          />
        </div>
        <button type="button" onClick={onClear} className="btn-ghost text-xs" title={t.sessionLog.clearAll}>
          <Trash2 size={15} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          {sessions.length === 0 ? t.sessionLog.empty : t.sessionLog.noResults}
        </p>
      ) : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {filtered.map((s) => (
            <SessionRow key={s.id} s={s} locale={locale} />
          ))}
        </ul>
      )}
    </div>
  )
}