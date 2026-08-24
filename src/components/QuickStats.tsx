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

  return (
    <section className="card flex w-full max-w-md 2xl:max-w-lg flex-col gap-3.5 sm:gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg font-display uppercase tracking-wide">{t.dashboard.todayFocus}</h3>
        <span className="text-xs font-mono text-muted">{t.dashboard.dailyGoal}</span>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold font-display tabular-nums text-fg">{fmtDuration(today * 60_000, lang)}</span>
          <span className="text-xs font-semibold font-mono tabular-nums text-accent">{pct}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-raised/70">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-btn border border-line/60 bg-raised/30 px-3 py-2.5 transition-colors hover:bg-raised/50">
          <Flame size={18} className="shrink-0 text-streak" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{t.dashboard.streak}</p>
            <p className="truncate text-base font-bold font-display tabular-nums leading-tight text-fg">
              {streak} {streak === 1 ? t.dashboard.day : t.dashboard.days}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-btn border border-line/60 bg-raised/30 px-3 py-2.5 transition-colors hover:bg-raised/50">
          <ListChecks size={18} className="shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{t.dashboard.pomodorosToday}</p>
            <p className="truncate text-base font-bold font-display tabular-nums leading-tight text-fg">{roundsToday}</p>
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">{t.dashboard.byTag}</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((ts) => (
              <span
                key={ts.tag}
                className="inline-flex items-center gap-1.5 rounded-badge border border-tag-border bg-tag-bg px-2.5 py-1 text-xs text-tag-text"
              >
                <span className="font-medium">{ts.tag}</span>
                <span className="font-mono text-muted tabular-nums">{ts.minutes} min</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
})