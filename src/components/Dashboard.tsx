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
import { Calendar, Check, Clock, Flame, Layers, PieChart as PieIcon } from 'lucide-react'
import type { Settings, Session, TodoItem } from '../types'
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
    <div className="card flex flex-col justify-between p-4 sm:p-5 transition-colors hover:border-line">
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-accent/15 text-accent">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted truncate">{label}</p>
          <p className="text-xl font-bold font-display tabular-nums text-fg truncate">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2.5 truncate text-xs font-medium tabular-nums text-muted">{sub}</p>}
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
    <div className="flex min-w-[170px] flex-col gap-1.5 rounded-card border border-line bg-surface/95 p-3 text-xs font-medium text-fg shadow-2xl backdrop-blur-md">
      <div className="border-b border-line/60 pb-1.5">
        <p className="font-semibold text-fg">{data.fullLabel}</p>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-muted">{t.dashboard.focusTime}</span>
          <span className="font-mono font-bold text-accent">
            {data.minutes > 0 ? fmtDuration(data.minutes * 60_000, lang as 'de' | 'en') : '0 min'}
          </span>
        </div>
      </div>

      {hasTags && (
        <div className="flex flex-col gap-1 pt-0.5">
          {data.tags.map((tg, idx) => {
            const tagColor = tg.color || colors.chart[idx % colors.chart.length]
            return (
              <div key={tg.tag} className="flex items-center justify-between gap-3 font-mono text-[11px]">
                <span className="flex items-center gap-1.5 truncate text-muted">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tagColor }} />
                  <span className="max-w-[110px] truncate">{tg.tag}</span>
                </span>
                <span className="font-semibold tabular-nums text-fg">{tg.minutes}m</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DonutEmptySkeleton({ colors, message }: { colors: ThemeColors; message: string }) {
  return (
    <div className="relative flex h-[240px] w-full flex-col items-center justify-center">
      <svg className="h-44 w-44 animate-pulse opacity-40" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke={colors.line}
          strokeWidth="12"
          strokeDasharray="6 4"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <PieIcon size={22} className="mb-2 text-muted opacity-60" />
        <p className="max-w-[200px] text-xs font-mono text-muted">{message}</p>
      </div>
    </div>
  )
}

function HourEmptySkeleton({ message }: { message: string }) {
  return (
    <div className="relative flex h-[220px] w-full flex-col items-center justify-center">
      <div className="flex h-28 w-full items-end justify-between px-2 opacity-30">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 rounded-t-sm border-t border-dashed border-line bg-raised"
            style={{ height: `${15 + (i % 5) * 12}%` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <Clock size={22} className="mb-2 text-muted opacity-60" />
        <p className="max-w-[220px] text-xs font-mono text-muted">{message}</p>
      </div>
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
  const colors = useThemeColors(themeId, colorMode)
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
  const goal = settings.weeklyGoalMinutes > 0 ? settings.weeklyGoalMinutes : 700
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
    <div className="flex w-full max-w-5xl flex-col gap-5">
      {/* Dashboard Top Header with Segmented Range Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-fg">{t.dashboard.periodOverview}</h2>
        {themeId === 'ios-26' ? (
          /* iOS 26 Unified Glass Segmented Range Filter */
          <div
            role="tablist"
            aria-label={t.dashboard.periodOverview}
            className="relative inline-grid grid-cols-3 w-full sm:w-auto min-w-[240px] sm:min-w-[270px] items-center p-1 rounded-full bg-black/[0.05] dark:bg-black/35 border border-black/[0.06] dark:border-white/10 backdrop-blur-xl select-none"
          >
            {/* Sliding Glass Puck */}
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-full bg-white dark:bg-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] border border-black/[0.04] dark:border-white/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
              style={{
                width: 'calc((100% - 8px - 8px) / 3)',
                left: '4px',
                transform: `translateX(calc(${TIME_RANGES.indexOf(timeRange)} * (100% + 4px)))`,
              }}
            />
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
                  className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-xs sm:text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? 'text-zinc-950 dark:text-white font-semibold'
                      : 'text-zinc-600 dark:text-white/60 hover:text-zinc-950 dark:hover:text-white font-medium'
                  }`}
                >
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          /* Standard / M3 / TUI Segmented Range Track */
          <div
            role="tablist"
            aria-label={t.dashboard.periodOverview}
            className="seg-track relative grid grid-cols-3 w-full sm:w-auto min-w-[240px] sm:min-w-[270px] items-center gap-1 select-none rounded-btn border border-line/70 bg-surface/80 p-1 backdrop-blur-md"
          >
            {/* Sliding Pill Indicator */}
            <div
              className="pointer-events-none absolute bottom-1 top-1 rounded-[calc(var(--radius-btn)-4px)] bg-raised shadow-sm ios-seg-active transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
              style={{
                width: 'calc((100% - 8px - 8px) / 3)',
                left: '4px',
                transform: `translateX(calc(${TIME_RANGES.indexOf(timeRange)} * (100% + 4px)))`,
              }}
            />
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
                  className={`relative z-10 flex min-h-[32px] sm:min-h-[34px] items-center justify-center gap-1.5 rounded-[calc(var(--radius-btn)-4px)] px-3 py-1 text-xs font-medium transition-colors duration-200 active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? 'text-fg font-semibold'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  {isActive && (
                    <Check size={13} className="m3-seg-check hidden animate-fade-in stroke-[2.5]" />
                  )}
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 4 Responsive KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Focus in Range */}
        <MetricCard
          icon={<Clock size={20} />}
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
          icon={<Calendar size={20} />}
          label={t.dashboard.avgDailyFocus}
          value={avgDaily.avgMinutes > 0 ? fmtDuration(avgDaily.avgMinutes * 60_000, lang) : '0 min'}
          sub={t.dashboard.avgDailyFocusSub(
            fmtDuration(avgDaily.avgMinutes * 60_000, lang),
            avgDaily.activeDays,
          )}
        />

        {/* Card 3: Daily Streak */}
        <MetricCard
          icon={<Flame size={20} className="text-streak" />}
          label={t.dashboard.streak}
          value={`${streak} ${streak === 1 ? t.dashboard.day : t.dashboard.days}`}
          sub={streak > 0 ? t.dashboard.streakActive : t.dashboard.streakReset}
        />

        {/* Card 4: Pomodoro vs Flow Breakdown */}
        <MetricCard
          icon={<Layers size={20} />}
          label={t.dashboard.pomodoroVsFlow}
          value={`${pomFlow.pomodoroPct}% / ${pomFlow.flowPct}%`}
          sub={t.dashboard.pomodoroRatio(pomFlow.pomodoroPct, pomFlow.flowPct)}
          extra={
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised flex">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${pomFlow.pomodoroPct}%` }}
              />
              <div
                className="h-full bg-success transition-all duration-300"
                style={{ width: `${pomFlow.flowPct}%` }}
              />
            </div>
          }
        />
      </div>

      {/* Main Focus Over Time Bar Chart */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg font-display uppercase tracking-wide">{chartTitle}</h3>
          <span className="text-xs font-mono text-muted">{t.dashboard.focusMinutes}</span>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.raised} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: colors.muted, fontSize: 11, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              interval={timeRange === 'month' ? 4 : 0}
            />
            <YAxis
              domain={yAxisConfig.domain}
              ticks={yAxisConfig.ticks}
              tickFormatter={formatYAxisTick}
              tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<BarChartTooltip colors={colors} lang={lang} t={t} />}
              cursor={{ fill: colors.raised, opacity: 0.5 }}
            />
            <Bar dataKey="minutes" fill={colors.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tag Distribution & Time of Day */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Distribution by Tag */}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-fg">{t.dashboard.byTag}</h3>
          {tagData.length === 0 ? (
            <DonutEmptySkeleton colors={colors} message={t.dashboard.noDataPeriod} />
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
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {tagData.map((entry) => (
                      <Cell key={entry.tag} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.line}`,
                      borderRadius: 'var(--radius-card)',
                      color: colors.fg,
                      fontSize: '12px',
                    }}
                    formatter={(v: number) => [`${v} min`, t.dashboard.focusTime]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {tagData.map((tItem) => (
                  <span key={tItem.tag} className="flex items-center gap-1.5 font-mono text-xs text-muted">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tItem.color }} />
                    <span className="truncate max-w-[120px]">{tItem.tag}</span>
                    <span className="text-[11px] font-semibold text-fg">({tItem.minutes}m)</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Time of Day */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">{t.dashboard.hourOfDay}</h3>
            <span className="text-xs font-mono text-muted">{t.dashboard.sessionsPerHour}</span>
          </div>
          {hourData.every((h) => h.count === 0) ? (
            <HourEmptySkeleton message={t.dashboard.noDataPeriod} />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={hourData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.raised} vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 'var(--radius-card)',
                    color: colors.fg,
                    fontSize: '12px',
                  }}
                  cursor={{ fill: colors.raised, opacity: 0.5 }}
                  formatter={(v: number) => [`${v} ${t.dashboard.sessions}`, t.dashboard.amount]}
                  labelFormatter={(h) => t.dashboard.hourRange(h as number)}
                />
                <Bar dataKey="count" fill={colors.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 52-Week Heatmap */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">{t.dashboard.last52Weeks}</h3>
          <span className="text-xs font-mono text-muted">{t.dashboard.focusMinutes}</span>
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