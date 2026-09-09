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
  title: string
  onClear: () => void
  onImportSettings: (s: unknown) => void
}

const SessionRow = memo(function SessionRow({ s, locale }: { s: Session; locale: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const hasNote = Boolean(s.notes?.trim())

  return (
    <li className="py-2 px-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-b border-line/30 font-mono">
      <div className="flex items-center gap-2.5 text-xs min-w-0">
        <span className="w-24 sm:w-28 shrink-0 text-[10px] text-muted tabular-nums truncate">
          {fmtDateTime(new Date(s.start), locale)}
        </span>
        <span className="w-14 shrink-0 text-[11px] font-medium text-fg tabular-nums">
          {fmtDuration(s.durationMs, locale === 'de-DE' ? 'de' : 'en')}
        </span>
        <span className="w-12 sm:w-14 shrink-0 text-[10px] text-muted/80 uppercase">
          {s.mode === 'flow' ? 'FLOW' : 'POMO'}
        </span>
        <span className="w-16 sm:w-20 shrink-0 text-[10px] text-fg/80 truncate" title={s.tag || undefined}>
          {s.tag ? (
            <span className="flex items-center gap-1 truncate">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: getTagColor(s.tag) }}
              />
              <span className="truncate">{s.tag}</span>
            </span>
          ) : (
            <span className="text-muted/40">—</span>
          )}
        </span>
        <span className="flex-1 min-w-0 text-fg text-xs truncate" title={s.task || t.sessionLog.noTask}>
          {s.task || <span className="text-muted/50 italic">{t.sessionLog.noTask}</span>}
        </span>
        <div className="w-16 shrink-0 flex items-center justify-end gap-1.5">
          {hasNote && (
            <button
              type="button"
              onClick={() => {
                playMicroClick('tap')
                setOpen((o) => !o)
              }}
              title={open ? 'Notiz ausblenden' : 'Notiz anzeigen'}
              className={`h-5 w-5 flex items-center justify-center rounded-[2px] border transition-colors cursor-pointer ${
                open
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-line bg-canvas text-muted hover:border-fg/40 hover:text-fg'
              }`}
            >
              <StickyNote size={11} />
            </button>
          )}
          <span className="text-[9px] font-mono text-muted/60 tracking-wider">LOGGED</span>
        </div>
      </div>
      {open && s.notes && (
        <p className="mt-2 whitespace-pre-wrap rounded-[2px] border border-line bg-canvas p-2.5 font-mono text-xs leading-relaxed text-fg">
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
    <div className="flex flex-col gap-3 font-mono select-none">
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1 border-b border-line/60">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg">{title}</h3>
          <span className="text-[10px] text-muted tracking-wider">[{filtered.length} ENTRIES]</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="flex h-8 items-center gap-1.5 rounded-[2px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 font-mono text-xs text-muted hover:border-fg/40 hover:text-fg transition-colors cursor-pointer"
          >
            <Upload size={12} /> {t.sessionLog.import}
          </button>

          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => {
                playMicroClick('tap')
                setOpen((o) => !o)
              }}
              className="flex h-8 items-center gap-1.5 rounded-[2px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 font-mono text-xs text-muted hover:border-fg/40 hover:text-fg transition-colors cursor-pointer"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <Download size={12} /> {t.sessionLog.export} <ChevronDown size={11} />
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-60 rounded-[2px] border border-line bg-surface p-1 shadow-none"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    playMicroClick('tap')
                    handleMdDownload()
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-left font-mono text-xs text-fg transition-colors hover:bg-fg/10 cursor-pointer"
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
                  className="flex w-full items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-left font-mono text-xs text-fg transition-colors hover:bg-fg/10 cursor-pointer"
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
                  className="flex w-full items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-left font-mono text-xs text-fg transition-colors hover:bg-fg/10 cursor-pointer"
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
                  className="flex w-full items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-left font-mono text-xs text-fg transition-colors hover:bg-fg/10 cursor-pointer"
                >
                  <FileJson size={13} className="text-muted" /> {t.sessionLog.json}
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/60" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.sessionLog.searchPlaceholder}
              className="h-8 w-36 sm:w-48 rounded-[2px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] pl-7 pr-2.5 font-mono text-xs text-fg placeholder:text-muted/50 focus:border-fg focus:outline-none transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onClear()
            }}
            disabled={sessions.length === 0}
            className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-muted hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30 transition-colors cursor-pointer"
            title={t.sessionLog.clearAll}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {importError && (
        <p role="status" className="font-mono text-[11px] uppercase tracking-wider text-accent">
          [ERROR: {importError}]
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center font-mono">
          <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-[2px] border border-line bg-canvas text-muted">
            <History size={16} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-fg">
            [ NO TELEMETRY DATA ]
          </p>
          <p className="mt-1 max-w-sm text-[11px] text-muted">
            {sessions.length === 0 ? t.sessionLog.emptySub : t.sessionLog.searchPlaceholder}
          </p>
        </div>
      ) : (
        <div className="flex flex-col w-full overflow-x-auto [scrollbar-width:thin]">
          {/* Telemetry Column Headers */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 border-b border-line/50 text-[9px] uppercase tracking-wider text-muted font-bold min-w-[540px]">
            <span className="w-24 sm:w-28 shrink-0">TIMESTAMP</span>
            <span className="w-14 shrink-0">DURATION</span>
            <span className="w-12 sm:w-14 shrink-0">MODE</span>
            <span className="w-16 sm:w-20 shrink-0">TAG</span>
            <span className="flex-1 min-w-0">TASK</span>
            <span className="w-16 shrink-0 text-right">STATUS</span>
          </div>

          <ul className="max-h-80 divide-y divide-line/30 overflow-y-auto min-w-[540px]">
            {filtered.map((s) => (
              <SessionRow key={s.id} s={s} locale={locale} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
})