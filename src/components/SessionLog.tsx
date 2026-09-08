import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Download, FileDown, FileJson, FileText, History, Search, StickyNote, Trash2, Upload } from 'lucide-react'
import type { Session, TodoItem } from '../types'
import { dayKey, fmtDateTime, fmtDuration } from '../lib/time'
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

const SessionRow = memo(function SessionRow({ s, locale }: { s: Session; locale: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const hasNote = Boolean(s.notes?.trim())

  return (
    <li className="py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-fg">{s.task || t.sessionLog.noTask}</span>
          <span className="font-mono text-[11px] text-muted">{fmtDateTime(new Date(s.start), locale)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasNote && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              title={open ? 'Notiz ausblenden' : 'Notiz anzeigen'}
              className={`rounded-full border p-1.5 transition-colors ${
                open
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-line text-muted hover:border-fg/40 hover:text-fg'
              }`}
            >
              <StickyNote size={13} />
            </button>
          )}
          <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-mono text-[10px] text-muted">
            {s.tag || '—'}
          </span>
          <span className="w-16 text-right font-mono text-xs tabular-nums text-fg">
            {fmtDuration(s.durationMs, locale === 'de-DE' ? 'de' : 'en')}
          </span>
        </div>
      </div>
      {open && s.notes && (
        <p className="mt-2 whitespace-pre-wrap rounded-card border border-line bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-fg">
          {s.notes}
        </p>
      )}
    </li>
  )
})

export const SessionLog = memo(function SessionLog({ sessions, todos, title, onClear, onImportSettings }: Props) {
  const { t, lang } = useTranslation()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copyTimerRef.current != null) window.clearTimeout(copyTimerRef.current)
    },
    [],
  )

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

  const todayKey = dayKey(new Date())

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as unknown
      let rawSessions: unknown[] | null = null
      let importedSettings: unknown = null

      if (Array.isArray(data)) {
        rawSessions = data
      } else if (data && typeof data === 'object' && data !== null) {
        const obj = data as { settings?: unknown; sessions?: unknown[] }
        if (Array.isArray(obj.sessions)) rawSessions = obj.sessions
        if (obj.settings) importedSettings = obj.settings
      }

      if (rawSessions && rawSessions.length > 0) {
        await importSessions(rawSessions)
      }
      if (importedSettings) {
        onImportSettings(importedSettings)
      }
      if (!rawSessions && !importedSettings) {
        alert(t.sessionLog.importFailed)
      }
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
        if (copyTimerRef.current != null) window.clearTimeout(copyTimerRef.current)
        copyTimerRef.current = window.setTimeout(() => {
          copyTimerRef.current = null
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
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-muted">{title}</h3>

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
          <button type="button" onClick={() => importRef.current?.click()} className="btn-ghost h-9 px-3 text-xs">
            <Upload size={14} /> {t.sessionLog.import}
          </button>

          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="btn-ghost h-9 px-3 text-xs"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <Download size={14} /> {t.sessionLog.export} <ChevronDown size={14} />
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-2 w-64 rounded-card border border-line-strong bg-surface p-1.5"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    handleMdDownload()
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs text-fg transition-colors hover:bg-surface-raised"
                >
                  <FileText size={14} className="text-muted" /> {t.sessionLog.mdDownload}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMdCopy}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs text-fg transition-colors hover:bg-surface-raised"
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
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs text-fg transition-colors hover:bg-surface-raised"
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
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs text-fg transition-colors hover:bg-surface-raised"
                >
                  <FileJson size={14} className="text-muted" /> {t.sessionLog.json}
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.sessionLog.searchPlaceholder}
              className="h-9 w-40 rounded-full border border-line bg-surface pl-9 pr-3.5 font-mono text-xs text-fg placeholder:text-muted focus:border-fg focus:outline-none sm:w-56"
            />
          </div>

          <button
            type="button"
            onClick={onClear}
            disabled={sessions.length === 0}
            className="btn-ghost h-9 w-9 rounded-full p-0 text-xs disabled:pointer-events-none disabled:opacity-30"
            title={t.sessionLog.clearAll}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-card border border-line bg-surface text-muted">
            <History size={20} />
          </div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-fg">
            {sessions.length === 0 ? t.sessionLog.empty : t.sessionLog.noResults}
          </p>
          <p className="mt-1 max-w-sm font-mono text-[11px] text-muted">
            {sessions.length === 0 ? t.sessionLog.emptySub : t.sessionLog.searchPlaceholder}
          </p>
        </div>
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