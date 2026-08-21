import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock, Flame, Target } from 'lucide-react'
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
import { fmtDuration, startOfWeek } from '../lib/time'
import { Heatmap } from './Heatmap'
import { SessionLog } from './SessionLog'
import { clearSessions } from '../lib/db'
import { useTranslation } from '../hooks/useTranslation'

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
    <div className="card flex items-center gap-4 p-5 transition-colors hover:border-line">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
        <p className="text-xl font-bold tabular-nums text-fg">{value}</p>
        {sub && <p className="truncate text-xs font-medium tabular-nums text-muted">{sub}</p>}
      </div>
    </div>
  )
}

export const Dashboard = memo(function Dashboard({ sessions, settings, themeId, todos, onImportSettings }: Props) {
  const { t, lang } = useTranslation()
  const colors = useThemeColors(themeId)
  const today = todayMinutes(sessions)
  const streak = currentStreakDays(sessions)
  const week = weekMinutes(sessions)
  const goal = settings.weeklyGoalMinutes
  const goalPct = Math.min(100, Math.round((week / goal) * 100))

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
    const idxToday = 6
    return lastNDaysStats(sessions, 7).map((d, i) => ({
      label: i === idxToday ? t.dashboard.today : t.weekdays[(d.date.getDay() + 6) % 7],
      minutes: d.minutes,
    }))
  }, [sessions, t])

  const tagData = useMemo(() => {
    const from = startOfWeek(new Date())
    return minutesByTag(sessions, from).map((t, i) => ({ ...t, color: colors.chart[i % colors.chart.length] }))
  }, [sessions, colors])

  const heat = useMemo(() => heatmapData(sessions, 52), [sessions])

  const hourData = useMemo(() => sessionsByHour(sessions), [sessions])

  return (
    <div className="flex w-full max-w-5xl flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<Clock size={20} />}
          label={t.dashboard.todayFocus}
          value={fmtDuration(today * 60_000, lang)}
          sub={today === 0 ? t.dashboard.noDataToday : `${today} min`}
        />
        <MetricCard
          icon={<Flame size={20} />}
          label={t.dashboard.streak}
          value={`${streak} ${streak === 1 ? t.dashboard.day : t.dashboard.days}`}
          sub={streak > 0 ? t.dashboard.streakActive : t.dashboard.streakReset}
        />
        <MetricCard
          icon={<Target size={20} />}
          label={t.dashboard.weeklyGoal}
          value={`${Math.round(week / 60)} / ${Math.round(goal / 60)} h`}
          sub={t.dashboard.goalReached(goalPct)}
        />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t.dashboard.last7Days}</h3>
          <span className="text-xs text-muted">{t.dashboard.focusMinutes}</span>
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
          <h3 className="mb-4 text-sm font-semibold text-fg">{t.dashboard.byTag}</h3>
          {tagData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{t.dashboard.noWeekData}</p>
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
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">{t.dashboard.hourOfDay}</h3>
            <span className="text-xs text-muted">{t.dashboard.sessionsPerHour}</span>
          </div>
          {hourData.every((h) => h.count === 0) ? (
            <p className="py-10 text-center text-sm text-muted">{t.dashboard.noData}</p>
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
                  formatter={(v: number) => [`${v} ${t.dashboard.sessions}`, t.dashboard.amount]}
                  labelFormatter={(h) => t.dashboard.hourRange(h as number)}
                />
                <Bar dataKey="count" fill={colors.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t.dashboard.last52Weeks}</h3>
          <span className="text-xs text-muted">{t.dashboard.focusMinutes}</span>
        </div>
        <Heatmap weeks={heat} />
      </div>

      <div className="card p-5">
        <SessionLog
          sessions={sessions}
          todos={todos}
          title={t.dashboard.sessionLog}
          onClear={() => void clearSessions()}
          onImportSettings={onImportSettings}
        />
      </div>
    </div>
  )
})