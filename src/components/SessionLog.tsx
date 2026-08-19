import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Download, FileDown, FileJson, FileText, Search, StickyNote, Trash2, Upload } from 'lucide-react'
import type { Session, TodoItem } from '../types'
import { fmtDateTime, fmtDuration } from '../lib/time'
import { buildDailyMarkdown, buildDayExport, copyMarkdown, downloadMarkdown } from '../lib/markdownExport'
import { downloadText, sessionsToCsv, sessionsToJson } from '../lib/dataExport'
import { importSessions } from '../lib/db'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  sessions: Session[]
  todos: TodoItem[]
  title: string
  onClear: () => void
  onImportSettings: (s: unknown) => void
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

export const SessionLog = memo(function SessionLog({ sessions, todos, title, onClear, onImportSettings }: Props) {
  const { t, lang } = useTranslation()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

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

  const todayKey = new Date().toISOString().slice(0, 10)

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as { settings?: unknown; sessions?: Session[] }
      if (Array.isArray(data.sessions)) await importSessions(data.sessions)
      if (data.settings) onImportSettings(data.settings)
    } catch {
      alert(t.sessionLog.importFailed)
    }
  }

  const handleMdDownload = () => {
    const exp = buildDayExport(sessions, new Date())
    downloadMarkdown(buildDailyMarkdown(exp, todos), exp.key)
  }

  const handleMdCopy = () => {
    void (async () => {
      try {
        await copyMarkdown(buildDailyMarkdown(buildDayExport(sessions, new Date()), todos))
        setCopied(true)
        window.setTimeout(() => {
          setCopied(false)
          setOpen(false)
        }, 1200)
      } catch {
        /* Zwischenablage nicht verfügbar */
      }
    })()
  }

  const handleSessionsCsv = () => {
    downloadText(`pomodoro-sessions-${todayKey}.csv`, sessionsToCsv(sessions), 'text/csv')
  }

  const handleSessionsJson = () => {
    downloadText(`pomodoro-sessions-${todayKey}.json`, sessionsToJson(sessions), 'application/json')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImport(f)
              e.target.value = ''
            }}
          />
          <button type="button" onClick={() => importRef.current?.click()} className="btn-ghost text-xs">
            <Upload size={14} /> {t.sessionLog.import}
          </button>

          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="btn-ghost text-xs"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <Download size={14} /> {t.sessionLog.export} <ChevronDown size={14} />
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    handleMdDownload()
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-raised"
                >
                  <FileText size={14} className="text-muted" /> {t.sessionLog.mdDownload}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMdCopy}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-raised"
                >
                  {copied ? (
                    <Check size={14} className="text-accent" />
                  ) : (
                    <Copy size={14} className="text-muted" />
                  )}
                  <span>{copied ? t.sessionLog.copied : t.sessionLog.copy}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    handleSessionsCsv()
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-raised"
                >
                  <FileDown size={14} className="text-muted" /> {t.sessionLog.csv}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    handleSessionsJson()
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-raised"
                >
                  <FileJson size={14} className="text-muted" /> {t.sessionLog.json}
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.sessionLog.searchPlaceholder}
              className="input w-40 pl-9 sm:w-56"
            />
          </div>

          <button type="button" onClick={onClear} className="btn-ghost text-xs" title={t.sessionLog.clearAll}>
            <Trash2 size={15} />
          </button>
        </div>
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
})