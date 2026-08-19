import { useMemo, useRef } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock, Download, Flame, Target, Upload } from 'lucide-react'
import type { Settings, Session } from '../types'
import {
  currentStreakDays,
  heatmapData,
  lastNDaysStats,
  minutesByTag,
  todayMinutes,
  weekMinutes,
} from '../lib/stats'
import { fmtDuration, startOfWeek, WEEKDAY_SHORT } from '../lib/time'
import { Heatmap } from './Heatmap'
import { SessionLog } from './SessionLog'
import { exportAll, importSessions, clearSessions } from '../lib/db'

interface Props {
  sessions: Session[]
  settings: Settings
  onImportSettings: (s: unknown) => void
}

const DONUT_COLORS = [
  '#f43f5e',
  '#fb923c',
  '#facc15',
  '#34d399',
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#94a3b8',
]

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: '10px',
  color: '#e4e4e7',
  fontSize: '12px',
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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xl font-bold text-zinc-100">{value}</p>
        {sub && <p className="truncate text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  )
}

export function Dashboard({ sessions, settings, onImportSettings }: Props) {
  const today = todayMinutes(sessions)
  const streak = currentStreakDays(sessions)
  const week = weekMinutes(sessions)
  const goal = settings.weeklyGoalMinutes
  const goalPct = Math.min(100, Math.round((week / goal) * 100))
  const importRef = useRef<HTMLInputElement>(null)

  const barData = useMemo(() => {
    return lastNDaysStats(sessions, 7).map((d, i) => ({
      label: i === 6 ? 'Heute' : WEEKDAY_SHORT[(d.date.getDay() + 6) % 7],
      minutes: d.minutes,
    }))
  }, [sessions])

  const tagData = useMemo(() => {
    const from = startOfWeek(new Date())
    return minutesByTag(sessions, from).map((t, i) => ({ ...t, color: DONUT_COLORS[i % DONUT_COLORS.length] }))
  }, [sessions])

  const heat = useMemo(() => heatmapData(sessions, 13), [sessions])

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
          <h3 className="text-sm font-semibold text-zinc-200">Letzte 7 Tage</h3>
          <span className="text-xs text-zinc-500">Fokuszeit in Minuten</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#27272a' }} />
            <Bar dataKey="minutes" fill="#f43f5e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Verteilung nach Tag</h3>
          {tagData.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">Diese Woche noch keine Daten.</p>
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
              <span key={t.tag} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.tag}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Letzte 13 Wochen</h3>
          <Heatmap weeks={heat} />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Session-Log</h3>
          <div className="flex gap-2">
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