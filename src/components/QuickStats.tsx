import { memo, useMemo } from 'react'
import { Flame, ListChecks } from 'lucide-react'
import type { Session, Settings } from '../types'
import { currentStreakDays, minutesByTag, todayMinutes } from '../lib/stats'
import { fmtDuration, sameDay, startOfDay } from '../lib/time'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  sessions: Session[]
  settings: Settings
}

export const QuickStats = memo(function QuickStats({ sessions, settings }: Props) {
  const { t, lang } = useTranslation()
  const today = useMemo(() => todayMinutes(sessions), [sessions])
  const dailyGoal = Math.max(1, Math.round((settings.weeklyGoalMinutes || 700) / 7))
  const pct = Math.min(100, Math.max(0, Math.round((today / dailyGoal) * 100)))
  const streak = useMemo(() => currentStreakDays(sessions), [sessions])
  const roundsToday = useMemo(
    () => sessions.filter((s) => sameDay(new Date(s.start), new Date())).length,
    [sessions],
  )
  const tags = useMemo(
    () => minutesByTag(sessions, startOfDay(new Date()), t.todo.noTag).slice(0, 5),
    [sessions, t.todo.noTag],
  )

  const TOTAL_GOAL_SEGMENTS = 16
  const filledGoalSegments = Math.min(
    TOTAL_GOAL_SEGMENTS,
    Math.max(0, Math.round((pct / 100) * TOTAL_GOAL_SEGMENTS)),
  )

  return (
    <section className="card flex w-full max-w-md 2xl:max-w-lg flex-col gap-4 p-5 sm:p-6 select-none">
      <div className="flex items-center justify-between font-mono">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest">{t.dashboard.todayFocus}</h3>
        <span className="text-[11px] text-muted uppercase tracking-wider">{t.dashboard.dailyGoal}</span>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2 font-mono">
          <span className="text-2xl font-bold tabular-nums text-fg">{fmtDuration(today * 60_000, lang)}</span>
          <span className="text-xs font-bold tabular-nums text-fg">{pct}%</span>
        </div>

        {/* Nothing Segmented Goal Bar */}
        <div className="mt-2.5 flex items-center w-full h-2 gap-[2px] p-0.5 rounded-sm bg-canvas border border-line/60">
          {Array.from({ length: TOTAL_GOAL_SEGMENTS }).map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-full rounded-none transition-colors duration-200 ${
                idx < filledGoalSegments ? 'bg-fg' : 'bg-surface-raised/40'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas p-3 transition-colors hover:border-fg/40">
          <Flame size={16} className="shrink-0 text-warning" />
          <div className="min-w-0 font-mono">
            <p className="text-[10px] uppercase tracking-wider text-muted truncate">{t.dashboard.streak}</p>
            <p className="truncate text-sm font-bold tabular-nums text-fg">
              {streak} {streak === 1 ? t.dashboard.day : t.dashboard.days}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas p-3 transition-colors hover:border-fg/40">
          <ListChecks size={16} className="shrink-0 text-fg" />
          <div className="min-w-0 font-mono">
            <p className="text-[10px] uppercase tracking-wider text-muted truncate">{t.dashboard.pomodorosToday}</p>
            <p className="truncate text-sm font-bold tabular-nums text-fg">{roundsToday}</p>
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{t.dashboard.byTag}</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((ts) => (
              <span
                key={ts.tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted"
              >
                <span className="text-fg font-medium">{ts.tag}</span>
                <span className="text-muted/60 tabular-nums">{ts.minutes}m</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
})