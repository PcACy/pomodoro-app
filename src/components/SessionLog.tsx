import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Download, FileDown, FileJson, FileText, History, Search, StickyNote, Trash2, Upload } from 'lucide-react'
import type { Session, TodoItem } from '../types'
import { dayKey, fmtDateTime, fmtDuration } from '../lib/time'
import { buildDailyMarkdown, buildDayExport, copyMarkdown, downloadMarkdown } from '../lib/markdownExport'
import { downloadText, sessionsToCsv, sessionsToJson } from '../lib/dataExport'
import { importSessions } from '../lib/db'
import { useTranslation } from '../hooks/useTranslation'
import { getTagColor } from './TodoList'
import { playMicroClick } from '../lib/sound'

interface Props {
  sessions: Session[]
  todos: TodoItem[]
  title?: string
  onClear: () => void
  onImportSettings: (s: unknown) => void
  onImportTodos?: (todos: unknown[]) => void
  className?: string
}

const SessionRow = memo(function SessionRow({ s, locale }: { s: Session; locale: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const hasNote = Boolean(s.notes?.trim())
  const isFlow = s.mode === 'flow'

  return (
    <li className="border-b border-line/40 py-2 transition-colors last:border-b-0 hover:bg-fg/[0.03]">
      {/* Mobile: two stacked lines so nothing collides at narrow widths.
          From `sm` up: a single aligned row. */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5">
        <div className="flex min-w-0 items-center gap-2 sm:w-[190px] sm:shrink-0">
          <span className="num shrink-0 text-[10px] text-muted">
            {fmtDateTime(new Date(s.start), locale)}
          </span>
          <span className="num shrink-0 text-[11px] font-medium text-fg">
            {fmtDuration(s.durationMs, locale === 'de-DE' ? 'de' : 'en')}
          </span>
          <span
            className={`shrink-0 rounded-xs border px-1.5 py-0.5 font-mono text-[9px] uppercase leading-none tracking-wider ${
              isFlow ? 'border-accent/40 text-accent' : 'border-line text-muted'
            }`}
          >
            {isFlow ? 'Flow' : 'Pomo'}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="min-w-0 flex-1 truncate text-xs text-fg"
            title={s.task || t.sessionLog.noTask}
          >
            {s.task || <span className="text-muted">{t.sessionLog.noTask}</span>}
          </span>
          {s.tag ? (
            <span className="hidden min-w-0 shrink items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted md:flex">
              <span
                aria-hidden="true"
                className="dot"
                style={{ backgroundColor: getTagColor(s.tag) }}
              />
              <span className="truncate">{s.tag}</span>
            </span>
          ) : null}
          {hasNote ? (
            <button
              type="button"
              onClick={() => {
                playMicroClick('tap')
                setOpen((o) => !o)
              }}
              title={open ? 'Hide note' : 'Show note'}
              aria-label={open ? 'Hide note' : 'Show note'}
              aria-expanded={open}
              className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xs border transition-colors ${
                open
                  ? 'border-accent/35 bg-accent/[0.07] text-accent'
                  : 'border-line text-muted hover:border-fg/40 hover:text-fg'
              }`}
            >
              <StickyNote size={11} />
            </button>
          ) : null}
        </div>
      </div>
      {open && s.notes ? (
        <p className="mt-2 whitespace-pre-wrap rounded-control border border-line bg-canvas p-2.5 font-mono text-xs leading-relaxed text-fg">
          {s.notes}
        </p>
      ) : null}
    </li>
  )
})

export const SessionLog = memo(function SessionLog({
  sessions,
  todos,
  title,
  onClear,
  onImportSettings,
  onImportTodos,
  className = '',
}: Props) {
  const { t, lang } = useTranslation()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
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
      let rawTodos: unknown[] | null = null

      if (Array.isArray(data)) {
        rawSessions = data
      } else if (data && typeof data === 'object' && data !== null) {
        const obj = data as { settings?: unknown; sessions?: unknown[]; todos?: unknown[] }
        if (Array.isArray(obj.sessions)) rawSessions = obj.sessions
        if (obj.settings) importedSettings = obj.settings
        if (Array.isArray(obj.todos)) rawTodos = obj.todos
      }

      if (rawSessions !== null) {
        await importSessions(rawSessions)
      }
      if (importedSettings) {
        onImportSettings(importedSettings)
      }
      if (rawTodos !== null) {
        onImportTodos?.(rawTodos)
      }
      if (rawSessions === null && !importedSettings && rawTodos === null) {
        setImportError(t.sessionLog.importFailed)
      }
    } catch {
      setImportError(t.sessionLog.importFailed)
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
    <div className={`flex h-full min-h-0 flex-col gap-3 select-none ${className}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
        {title ? (
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="dot bg-accent" />
            <h3 className="label text-fg">{title}</h3>
          </div>
        ) : (
          <span className="label">
            {filtered.length} {t.dashboard.sessions}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
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
          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              importRef.current?.click()
            }}
            className="chip"
          >
            <Upload size={11} />
            {t.sessionLog.import}
          </button>

          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => {
                playMicroClick('tap')
                setOpen((o) => !o)
              }}
              className="chip"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <Download size={11} />
              {t.sessionLog.export}
              <ChevronDown size={10} />
            </button>
            {open ? (
              <div
                role="menu"
                className="panel absolute right-0 top-full z-20 mt-1.5 flex w-56 flex-col gap-0.5 p-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    playMicroClick('tap')
                    handleMdDownload()
                    setOpen(false)
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs text-fg transition-colors hover:bg-fg/[0.06]"
                >
                  <FileText size={13} className="text-muted" /> {t.sessionLog.mdDownload}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    playMicroClick('tap')
                    handleMdCopy()
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs text-fg transition-colors hover:bg-fg/[0.06]"
                >
                  {copied ? (
                    <Check size={13} className="text-accent" />
                  ) : (
                    <Copy size={13} className="text-muted" />
                  )}
                  <span>{copied ? t.sessionLog.copied : t.sessionLog.copy}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    playMicroClick('tap')
                    handleSessionsCsv()
                    setOpen(false)
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs text-fg transition-colors hover:bg-fg/[0.06]"
                >
                  <FileDown size={13} className="text-muted" /> {t.sessionLog.csv}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    playMicroClick('tap')
                    handleSessionsJson()
                    setOpen(false)
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs text-fg transition-colors hover:bg-fg/[0.06]"
                >
                  <FileJson size={13} className="text-muted" /> {t.sessionLog.json}
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <Search
              size={12}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.sessionLog.searchPlaceholder}
              aria-label={t.sessionLog.searchPlaceholder}
              className="input h-8 w-36 py-0 pl-7 pr-2.5 font-mono text-xs placeholder:text-muted/70 sm:w-48"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onClear()
            }}
            disabled={sessions.length === 0}
            className="icon-btn !h-8 !w-8 hover:!border-accent/50 hover:!text-accent"
            title={t.sessionLog.clearAll}
            aria-label={t.sessionLog.clearAll}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {importError ? (
        <p role="status" className="label shrink-0 text-accent">
          [{importError}]
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="empty">
          <span className="empty-mark">
            <History size={15} />
          </span>
          <p className="label">No telemetry data</p>
          <p className="max-w-xs text-xs text-muted">
            {sessions.length === 0 ? t.sessionLog.emptySub : t.sessionLog.searchPlaceholder}
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col">
          {/* Column headers only make sense once rows are single-line */}
          <div className="label-sm hidden min-w-0 shrink-0 items-center gap-2.5 border-b border-line/50 py-2 sm:flex">
            <span className="w-[190px] shrink-0">When</span>
            <span className="min-w-0 flex-1">Task</span>
          </div>

          <ul className="no-scrollbar min-h-0 flex-1 divide-y divide-line/30 overflow-y-auto">
            {filtered.map((s) => (
              <SessionRow key={s.id} s={s} locale={locale} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
})