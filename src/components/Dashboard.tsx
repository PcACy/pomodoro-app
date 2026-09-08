import { memo, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Calendar, Clock, Flame, Layers } from 'lucide-react'
import type { Settings, Session, TodoItem } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import type { ColorMode, ThemeId } from '../themes'
import { useThemeColors } from '../hooks/useTheme'
import {
  averageDailyFocusMinutes,
  currentStreakDays,
  filterSessionsByRange,
  formatYAxisTick,
  getYAxisConfig,
  heatmapData,
  minutesByTag,
  pomodoroVsFlowBreakdown,
  rangeBarStats,
  sessionsByHour,
  totalFocusStats,
  type RangeBarStat,
  type TimeRange,
} from '../lib/stats'
import { fmtDuration } from '../lib/time'
import { Heatmap } from './Heatmap'
import { SessionLog } from './SessionLog'
import { clearSessions } from '../lib/db'
import { useTranslation } from '../hooks/useTranslation'
import type { Messages } from '../lib/i18n'

type ThemeColors = ReturnType<typeof useThemeColors>

const TIME_RANGES: TimeRange[] = ['week', 'month', 'all']

interface Props {
  sessions: Session[]
  settings: Settings
  themeId: ThemeId
  colorMode?: ColorMode
  todos: TodoItem[]
  onImportSettings: (s: unknown) => void
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  extra,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="card flex flex-col justify-between p-4 sm:p-5 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-fg">
          {icon}
        </div>
        <div className="min-w-0 flex-1 font-mono">
          <p className="text-[10px] uppercase tracking-wider text-muted truncate">{label}</p>
          <p className="text-xl font-bold tabular-nums text-fg truncate">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2.5 truncate font-mono text-[11px] tabular-nums text-muted">{sub}</p>}
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  )
}

interface CustomBarTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: RangeBarStat
    value: number
  }>
}

function BarChartTooltip({
  active,
  payload,
  colors,
  lang,
  t,
}: CustomBarTooltipProps & { colors: ThemeColors; lang: string; t: Messages }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  const hasTags = data.tags && data.tags.length > 0

  return (
    <div className="flex min-w-[170px] flex-col gap-1.5 rounded-lg border border-line bg-surface p-3 font-mono text-xs text-fg shadow-none">
      <div className="border-b border-line pb-1.5">
        <p className="font-bold uppercase text-fg">{data.fullLabel}</p>
        <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px]">
          <span className="text-muted">{t.dashboard.focusTime}</span>
          <span className="font-bold tabular-nums text-fg">
            {data.minutes > 0 ? fmtDuration(data.minutes * 60_000, lang as 'de' | 'en') : '0 min'}
          </span>
        </div>
      </div>

      {hasTags && (
        <div className="flex flex-col gap-1 pt-0.5">
          {data.tags.map((tg, idx) => {
            const tagColor = tg.color || colors.chart[idx % colors.chart.length]
            return (
              <div key={tg.tag} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 truncate text-muted">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tagColor }} />
                  <span className="max-w-[110px] truncate">{tg.tag}</span>
                </span>
                <span className="font-bold tabular-nums text-fg">{tg.minutes}m</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DonutEmptySkeleton({ message }: { message: string }) {
  return (
    <div className="relative flex h-[240px] w-full flex-col items-center justify-center font-mono">
      <div className="border border-dashed border-line rounded-full h-36 w-36 flex items-center justify-center">
        <p className="max-w-[160px] text-center text-xs uppercase tracking-wider text-muted">{message}</p>
      </div>
    </div>
  )
}

function HourEmptySkeleton({ message }: { message: string }) {
  return (
    <div className="relative flex h-[220px] w-full flex-col items-center justify-center font-mono">
      <p className="text-xs uppercase tracking-wider text-muted">{message}</p>
    </div>
  )
}

export const Dashboard = memo(function Dashboard({
  sessions,
  settings,
  themeId,
  colorMode = 'dark',
  todos,
  onImportSettings,
}: Props) {
  const { t, lang } = useTranslation()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const colors = useThemeColors(themeId, colorMode, settings.accentColor)
  const [timeRange, setTimeRange] = useState<TimeRange>('week')

  const filteredSessions = useMemo(
    () => filterSessionsByRange(sessions, timeRange),
    [sessions, timeRange],
  )

  // KPI metrics
  const streak = useMemo(() => currentStreakDays(sessions), [sessions])
  const totalFocus = useMemo(() => totalFocusStats(filteredSessions), [filteredSessions])
  const avgDaily = useMemo(() => averageDailyFocusMinutes(filteredSessions), [filteredSessions])
  const pomFlow = useMemo(() => pomodoroVsFlowBreakdown(filteredSessions), [filteredSessions])
  const goal =
    settings.weeklyGoalMinutes > 0
      ? settings.weeklyGoalMinutes
      : DEFAULT_SETTINGS.weeklyGoalMinutes
  const goalPct = Math.min(100, Math.max(0, Math.round((totalFocus.totalMinutes / goal) * 100)))

  // Bar Chart Data & Y-Axis Scale
  const barData = useMemo(
    () => rangeBarStats(sessions, timeRange, locale, t.todo.noTag),
    [sessions, timeRange, locale, t.todo.noTag],
  )

  const maxMinutes = useMemo(
    () => Math.max(0, ...barData.map((d) => d.minutes)),
    [barData],
  )

  const yAxisConfig = useMemo(() => getYAxisConfig(maxMinutes), [maxMinutes])

  // Tag Distribution Data
  const tagData = useMemo(() => {
    return minutesByTag(filteredSessions, undefined, t.todo.noTag).map((item, i) => ({
      ...item,
      color: colors.chart[i % colors.chart.length],
    }))
  }, [filteredSessions, colors, t.todo.noTag])

  // Hour distribution (time of day)
  const hourData = useMemo(() => sessionsByHour(filteredSessions), [filteredSessions])

  // 52-Week Heatmap
  const heat = useMemo(() => heatmapData(sessions, 52), [sessions])

  const chartTitle = useMemo(() => {
    if (timeRange === 'week') return t.dashboard.last7Days
    if (timeRange === 'month') return t.dashboard.rangeMonth
    return t.dashboard.rangeAllTime
  }, [timeRange, t])

  return (
    <div className="flex w-full max-w-5xl flex-col gap-5 select-none">
      {/* Dashboard Top Header with Segmented Range Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-fg">{t.dashboard.periodOverview}</h2>
        <div
          role="tablist"
          aria-label={t.dashboard.periodOverview}
          className="inline-flex items-center p-1 rounded-full border border-line bg-canvas font-mono text-xs uppercase"
        >
          {TIME_RANGES.map((r) => {
            const label =
              r === 'week'
                ? t.dashboard.rangeWeek
                : r === 'month'
                ? t.dashboard.rangeMonth
                : t.dashboard.rangeAllTime
            const isActive = timeRange === r
            return (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTimeRange(r)}
                className={`px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-fg text-canvas'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 4 Responsive KPI Metric Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Focus in Range */}
        <MetricCard
          icon={<Clock size={18} />}
          label={timeRange === 'week' ? t.dashboard.weeklyGoal : t.dashboard.totalFocusTime}
          value={fmtDuration(totalFocus.totalMinutes * 60_000, lang)}
          sub={
            timeRange === 'week'
              ? t.dashboard.goalReached(goalPct)
              : t.dashboard.totalFocusTimeSub(totalFocus.totalHours, totalFocus.sessionCount)
          }
        />

        {/* Card 2: Ø Daily Focus per Active Day */}
        <MetricCard
          icon={<Calendar size={18} />}
          label={t.dashboard.avgDailyFocus}
          value={avgDaily.avgMinutes > 0 ? fmtDuration(avgDaily.avgMinutes * 60_000, lang) : '0 min'}
          sub={t.dashboard.avgDailyFocusSub(
            fmtDuration(avgDaily.avgMinutes * 60_000, lang),
            avgDaily.activeDays,
          )}
        />

        {/* Card 3: Daily Streak */}
        <MetricCard
          icon={<Flame size={18} className="text-warning" />}
          label={t.dashboard.streak}
          value={`${streak} ${streak === 1 ? t.dashboard.day : t.dashboard.days}`}
          sub={streak > 0 ? t.dashboard.streakActive : t.dashboard.streakReset}
        />

        {/* Card 4: Pomodoro vs Flow Breakdown */}
        <MetricCard
          icon={<Layers size={18} />}
          label={t.dashboard.pomodoroVsFlow}
          value={`${pomFlow.pomodoroPct}% / ${pomFlow.flowPct}%`}
          sub={t.dashboard.pomodoroRatio(pomFlow.pomodoroPct, pomFlow.flowPct)}
          extra={
            <div className="h-1.5 w-full overflow-hidden rounded-none bg-canvas border border-line flex">
              <div
                className="h-full bg-fg transition-all duration-300"
                style={{ width: `${pomFlow.pomodoroPct}%` }}
              />
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${pomFlow.flowPct}%` }}
              />
            </div>
          }
        />
      </div>

      {/* Main Focus Over Time Bar Chart (Nothing Monochrome with Square Bars) */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between font-mono">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest">{chartTitle}</h3>
          <span className="text-[10px] uppercase text-muted tracking-wider">{t.dashboard.focusMinutes}</span>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke={colors.line} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'Space Mono, monospace' }}
              axisLine={{ stroke: colors.line }}
              tickLine={false}
              interval={timeRange === 'month' ? 4 : 0}
            />
            <YAxis
              domain={yAxisConfig.domain}
              ticks={yAxisConfig.ticks}
              tickFormatter={formatYAxisTick}
              tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'Space Mono, monospace' }}
              axisLine={{ stroke: colors.line }}
              tickLine={false}
            />
            <Tooltip
              content={<BarChartTooltip colors={colors} lang={lang} t={t} />}
              cursor={{ fill: colors.raised, opacity: 0.3 }}
            />
            <Bar dataKey="minutes" fill={colors.fg} radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tag Distribution & Time of Day */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Distribution by Tag */}
        <div className="card p-5">
          <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-muted">{t.dashboard.byTag}</h3>
          {tagData.length === 0 ? (
            <DonutEmptySkeleton message={t.dashboard.noDataPeriod} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={tagData}
                    dataKey="minutes"
                    nameKey="tag"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    strokeWidth={1}
                    stroke={colors.surface}
                  >
                    {tagData.map((entry) => (
                      <Cell key={entry.tag} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.line}`,
                      borderRadius: '8px',
                      color: colors.fg,
                      fontSize: '11px',
                      fontFamily: 'Space Mono, monospace',
                    }}
                    formatter={(v: number) => [`${v} min`, t.dashboard.focusTime]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                {tagData.map((tItem) => (
                  <span key={tItem.tag} className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tItem.color }} />
                    <span className="truncate max-w-[120px]">{tItem.tag}</span>
                    <span className="font-bold tabular-nums text-fg">({tItem.minutes}m)</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Time of Day */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between font-mono">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{t.dashboard.hourOfDay}</h3>
            <span className="text-[10px] uppercase text-muted tracking-wider">{t.dashboard.sessionsPerHour}</span>
          </div>
          {hourData.every((h) => h.count === 0) ? (
            <HourEmptySkeleton message={t.dashboard.noDataPeriod} />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={hourData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke={colors.line} vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'Space Mono, monospace' }}
                  axisLine={{ stroke: colors.line }}
                  tickLine={false}
                  ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'Space Mono, monospace' }}
                  axisLine={{ stroke: colors.line }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.line}`,
                    borderRadius: '8px',
                    color: colors.fg,
                    fontSize: '11px',
                    fontFamily: 'Space Mono, monospace',
                  }}
                  cursor={{ fill: colors.raised, opacity: 0.3 }}
                  formatter={(v: number) => [`${v} ${t.dashboard.sessions}`, t.dashboard.amount]}
                  labelFormatter={(h) => t.dashboard.hourRange(h as number)}
                />
                <Bar dataKey="count" fill={colors.fg} radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 52-Week Heatmap */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between font-mono">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{t.dashboard.last52Weeks}</h3>
          <span className="text-[10px] uppercase text-muted tracking-wider">{t.dashboard.focusMinutes}</span>
        </div>
        <Heatmap weeks={heat} />
      </div>

      {/* Session Log */}
      <div className="card p-5">
        <SessionLog
          sessions={sessions}
          todos={todos}
          title={t.dashboard.sessionLog}
          onClear={() => {
            if (window.confirm(t.settings.confirmClear)) void clearSessions()
          }}
          onImportSettings={onImportSettings}
        />
      </div>
    </div>
  )
})
