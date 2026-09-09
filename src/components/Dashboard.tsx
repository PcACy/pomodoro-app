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
import type { Settings, Session, TodoItem } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import type { ColorMode } from '../themes'
import { useThemeColors } from '../hooks/useTheme'
import { getTagColor } from './TodoList'
import {
  averageDailyFocusMinutes,
  currentStreakDays,
  filterSessionsByRange,
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
import { SlidingSegmentedControl } from './SlidingSegmentedControl'
interface Props {
  sessions: Session[]
  settings: Settings
  colorMode?: ColorMode
  todos: TodoItem[]
  onImportSettings: (s: unknown) => void
}

function MetricCard({
  channel,
  label,
  value,
  sub,
  extra,
}: {
  channel: string
  label?: string
  value: string
  sub?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="card flex flex-col justify-between p-4 sm:p-5 transition-colors select-none font-mono">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
            {channel}
          </p>
          {label && (
            <span className="text-[9px] uppercase tracking-wider text-muted/60 shrink-0">
              {label}
            </span>
          )}
        </div>
        <p
          className={`font-mono font-medium tracking-tight text-fg tabular-nums truncate ${
            value.length > 8 ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {value}
        </p>
      </div>
      {sub && <p className="mt-2.5 truncate font-mono text-[10px] sm:text-[11px] tabular-nums text-muted">{sub}</p>}
      {extra && <div className="mt-2.5">{extra}</div>}
    </div>
  )
}

function formatHardwareYAxisTick(minutes: number): string {
  if (minutes === 0) return '00M'
  if (minutes < 60) return `${String(minutes).padStart(2, '0')}M`
  const h = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (rem === 0) return `${String(h).padStart(2, '0')}H`
  return `${String(h).padStart(2, '0')}H${String(rem).padStart(2, '0')}`
}

function formatHardwareXAxisTick(label: string): string {
  return label.slice(0, 3).toUpperCase()
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
  lang,
  t,
}: CustomBarTooltipProps & { lang: string; t: Messages }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  const hasTags = data.tags && data.tags.length > 0

  return (
    <div className="flex min-w-[170px] flex-col gap-1.5 rounded-[2px] border border-line bg-surface p-2.5 font-mono text-xs text-fg shadow-none">
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
          {data.tags.map((tg) => {
            const tagColor = getTagColor(tg.tag)
            return (
              <div key={tg.tag} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 truncate text-muted">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: tagColor,
                    }}
                  />
                  <span className="max-w-[110px] truncate text-fg/90">{tg.tag}</span>
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

function DonutEmptySkeleton({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 font-mono select-none">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-line/60 bg-canvas/30 mb-3">
        <span className="text-muted/60 text-xs font-mono">0.0%</span>
      </div>
      <p className="max-w-[210px] text-center text-[10px] uppercase tracking-widest text-muted">
        {message ?? '[ NO TELEMETRY DATA ]'}
      </p>
    </div>
  )
}

function HourEmptySkeleton({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 font-mono select-none">
      <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-[260px] px-2 mb-3">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-line/30 rounded-[1px] transition-all"
            style={{ height: i % 6 === 0 ? '16px' : '6px' }}
          />
        ))}
      </div>
      <p className="max-w-[210px] text-center text-[10px] uppercase tracking-widest text-muted">
        {message ?? '[ NO TELEMETRY DATA ]'}
      </p>
    </div>
  )
}

export const Dashboard = memo(function Dashboard({
  sessions,
  settings,
  colorMode = 'dark',
  todos,
  onImportSettings,
}: Props) {
  const { t, lang } = useTranslation()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const colors = useThemeColors(colorMode)
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

  // Tag Distribution Data — monochrome opacity steps (Nothing spec: opacity before color)
  const tagData = useMemo(() => {
    const items = minutesByTag(filteredSessions, undefined, t.todo.noTag)
    const steps = [1, 0.6, 0.35, 0.22, 0.14]
    return items.map((item, idx) => ({
      ...item,
      color: item.tag === '__NOTAG__' ? colors.muted : colors.fg,
      opacity: steps[Math.min(idx, steps.length - 1)],
    }))
  }, [filteredSessions, t.todo.noTag, colors.fg, colors.muted])

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
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono">
        <h2 className="text-xs font-bold uppercase tracking-widest text-fg">
          TIMEFRAME
        </h2>
        <SlidingSegmentedControl<TimeRange>
          options={[
            { value: 'week', label: 'WEEK' },
            { value: 'month', label: 'MONTH' },
            { value: 'all', label: 'ALL TIME' },
          ]}
          value={timeRange}
          onChange={setTimeRange}
          size="sm"
          ariaLabel="Timeframe Filter"
        />
      </div>

      {/* 4 Responsive KPI Metric Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Focus in Range */}
        <MetricCard
          channel="TOTAL TIME"
          label={timeRange.toUpperCase()}
          value={fmtDuration(totalFocus.totalMinutes * 60_000, lang)}
          sub={
            timeRange === 'week'
              ? t.dashboard.goalReached(goalPct)
              : t.dashboard.totalFocusTimeSub(totalFocus.totalHours, totalFocus.sessionCount)
          }
        />

        {/* Card 2: Ø Daily Focus per Active Day */}
        <MetricCard
          channel="DAILY AVG"
          label="24H RATE"
          value={avgDaily.avgMinutes > 0 ? fmtDuration(avgDaily.avgMinutes * 60_000, lang) : '0 min'}
          sub={t.dashboard.avgDailyFocusSub(
            fmtDuration(avgDaily.avgMinutes * 60_000, lang),
            avgDaily.activeDays,
          )}
        />

        {/* Card 3: Daily Streak */}
        <MetricCard
          channel="STREAK"
          label="SEQUENCE"
          value={`${streak} ${streak === 1 ? 'DAY' : 'DAYS'}`}
          sub={streak > 0 ? t.dashboard.streakActive : t.dashboard.streakReset}
        />

        {/* Card 4: Pomodoro vs Flow Breakdown */}
        <MetricCard
          channel="POMO / FLOW"
          label="RATIO"
          value={`${pomFlow.pomodoroPct}% / ${pomFlow.flowPct}%`}
          sub={t.dashboard.pomodoroRatio(pomFlow.pomodoroPct, pomFlow.flowPct)}
          extra={
            <div className="flex flex-col gap-1.5">
              <div
                className="h-2.5 w-full flex gap-1"
                role="img"
                aria-label={`Pomodoro ${pomFlow.pomodoroPct}%, Flow ${pomFlow.flowPct}%`}
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const totalSessions = filteredSessions.length
                  if (totalSessions === 0) {
                    return (
                      <div
                        key={i}
                        className="flex-1 h-full rounded-[1px] bg-black/[0.04] border border-black/5 dark:bg-white/[0.04] dark:border-white/5"
                      />
                    )
                  }
                  const pomoThreshold = Math.round((pomFlow.pomodoroPct / 100) * 12)
                  const isPomo = i < pomoThreshold
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-full rounded-[1px] transition-colors duration-150 ${
                        isPomo ? 'bg-fg' : 'bg-muted/50 dark:bg-white/30'
                      }`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between font-mono text-[8px] text-muted tracking-widest uppercase">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-[1px] bg-fg shrink-0" /> POMO
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-[1px] bg-muted/50 dark:bg-white/30 shrink-0" /> FLOW
                </span>
              </div>
            </div>
          }
        />
      </div>

      {/* Main Focus Over Time Bar Chart (Nothing Monochrome with Square Bars) */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between font-mono">
          <h3 className="text-xs font-bold text-fg uppercase tracking-widest">{chartTitle}</h3>
          <span className="text-[9px] uppercase text-muted tracking-wider font-mono">TELEMETRY</span>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="1 3" stroke={colors.line} vertical={false} />
            <XAxis
              dataKey="label"
              tickFormatter={formatHardwareXAxisTick}
              tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'Space Mono, monospace' }}
              axisLine={{ stroke: colors.line }}
              tickLine={false}
              interval={timeRange === 'month' ? 4 : 0}
            />
            <YAxis
              domain={yAxisConfig.domain}
              ticks={yAxisConfig.ticks}
              tickFormatter={formatHardwareYAxisTick}
              tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'Space Mono, monospace' }}
              axisLine={{ stroke: colors.line }}
              tickLine={false}
            />
            <Tooltip
              content={<BarChartTooltip lang={lang} t={t} />}
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
                      <Cell key={entry.tag} fill={entry.color} fillOpacity={entry.opacity} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.line}`,
                      borderRadius: '2px',
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
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: tItem.color,
                        opacity: tItem.opacity,
                      }}
                    />
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
                <CartesianGrid strokeDasharray="1 3" stroke={colors.line} vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'Space Mono, monospace' }}
                  axisLine={{ stroke: colors.line }}
                  tickLine={false}
                  ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
                  tickFormatter={(h) => `${String(h).padStart(2, '0')}H`}
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
                    borderRadius: '2px',
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
