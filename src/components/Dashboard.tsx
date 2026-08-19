import { useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, Clock, Copy, Download, FileDown, Flame, Target, Upload } from 'lucide-react'
import type { Settings, Session, TodoItem } from '../types'
import type { ThemeId } from '../themes'
import { useThemeColors } from '../hooks/useTheme'
import {
  currentStreakDays,
  heatmapData,
  lastNDaysStats,
  minutesByTag,
  sessionsByHour,
  todayMinutes,
  weekMinutes,
} from '../lib/stats'
import { fmtDuration, startOfWeek, WEEKDAY_SHORT } from '../lib/time'
import { buildDailyMarkdown, buildDayExport, copyMarkdown, downloadMarkdown } from '../lib/markdownExport'
import { Heatmap } from './Heatmap'
import { SessionLog } from './SessionLog'
import { exportAll, importSessions, clearSessions } from '../lib/db'

interface Props {
  sessions: Session[]
  settings: Settings
  themeId: ThemeId
  todos: TodoItem[]
  onImportSettings: (s: unknown) => void
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-xl font-bold text-fg">{value}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  )
}

export function Dashboard({ sessions, settings, themeId, todos, onImportSettings }: Props) {
  const colors = useThemeColors(themeId)
  const today = todayMinutes(sessions)
  const streak = currentStreakDays(sessions)
  const week = weekMinutes(sessions)
  const goal = settings.weeklyGoalMinutes
  const goalPct = Math.min(100, Math.round((week / goal) * 100))
  const importRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      border: `1px solid ${colors.line}`,
      borderRadius: '10px',
      color: colors.fg,
      fontSize: '12px',
    }),
    [colors],
  )

  const barData = useMemo(() => {
    return lastNDaysStats(sessions, 7).map((d, i) => ({
      label: i === 6 ? 'Heute' : WEEKDAY_SHORT[(d.date.getDay() + 6) % 7],
      minutes: d.minutes,
    }))
  }, [sessions])

  const tagData = useMemo(() => {
    const from = startOfWeek(new Date())
    return minutesByTag(sessions, from).map((t, i) => ({ ...t, color: colors.chart[i % colors.chart.length] }))
  }, [sessions, colors])

  const heat = useMemo(() => heatmapData(sessions, 13), [sessions])

  const hourData = useMemo(() => sessionsByHour(sessions), [sessions])

  const handleExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pomodoro-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as { settings?: unknown; sessions?: Session[] }
      if (Array.isArray(data.sessions)) await importSessions(data.sessions)
      if (data.settings) onImportSettings(data.settings)
    } catch {
      alert('Import fehlgeschlagen: Die Datei ist kein gültiges Backup.')
    }
  }

  const todayExport = () => buildDayExport(sessions, new Date())

  const handleMdDownload = () => {
    const exp = todayExport()
    downloadMarkdown(buildDailyMarkdown(exp, todos), exp.key)
  }

  const handleMdCopy = async () => {
    try {
      await copyMarkdown(buildDailyMarkdown(todayExport(), todos))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<Clock size={20} />}
          label="Heutige Fokuszeit"
          value={fmtDuration(today * 60_000)}
          sub={today === 0 ? 'Noch nichts erfasst' : `${today} min`}
        />
        <MetricCard
          icon={<Flame size={20} />}
          label="Tages-Streak"
          value={`${streak} ${streak === 1 ? 'Tag' : 'Tage'}`}
          sub={streak > 0 ? 'Am Laufen' : 'Morgen neu starten'}
        />
        <MetricCard
          icon={<Target size={20} />}
          label="Wochenziel"
          value={`${Math.round(week / 60)} / ${Math.round(goal / 60)} h`}
          sub={`${goalPct}% erreicht`}
        />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Letzte 7 Tage</h3>
          <span className="text-xs text-muted">Fokuszeit in Minuten</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.raised} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.raised }} />
            <Bar dataKey="minutes" fill={colors.accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg">Verteilung nach Tag</h3>
          {tagData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Diese Woche noch keine Daten.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={tagData}
                  dataKey="minutes"
                  nameKey="tag"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {tagData.map((entry) => (
                    <Cell key={entry.tag} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} min`} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {tagData.map((t) => (
              <span key={t.tag} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.tag}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg">Letzte 13 Wochen</h3>
          <Heatmap weeks={heat} />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Tageszeit</h3>
          <span className="text-xs text-muted">Abgeschlossene Sessions pro Stunde</span>
        </div>
        {hourData.every((h) => h.count === 0) ? (
          <p className="py-10 text-center text-sm text-muted">Noch keine Daten.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.raised} vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
                tickFormatter={(h) => `${h}:00`}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: colors.raised }}
                formatter={(v: number) => [`${v} Sessions`, 'Anzahl']}
                labelFormatter={(h) => `${h}:00 – ${h + 1}:00 Uhr`}
              />
              <Bar dataKey="count" fill={colors.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Session-Log</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleMdDownload} className="btn-ghost text-xs" title="Obsidian Markdown für heute herunterladen">
              <FileDown size={14} /> Als .md
            </button>
            <button type="button" onClick={() => void handleMdCopy()} className="btn-ghost text-xs" title="Markdown für heute in die Zwischenablage kopieren">
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
            <button type="button" onClick={handleExport} className="btn-ghost text-xs">
              <Download size={14} /> Export
            </button>
            <button type="button" onClick={() => importRef.current?.click()} className="btn-ghost text-xs">
              <Upload size={14} /> Import
            </button>
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
          </div>
        </div>
        <SessionLog sessions={sessions} onClear={() => void clearSessions()} />
      </div>
    </div>
  )
}