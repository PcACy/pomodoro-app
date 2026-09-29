import { memo, useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { Session } from '../../types'
import { BentoCard } from './BentoCard'
import { currentStreakDays } from '../../lib/stats'
import { addDays, dayKey, sameDay, startOfWeek } from '../../lib/time'
import { playMicroClick } from '../../lib/sound'
import { useTranslation } from '../../hooks/useTranslation'

interface SystemStatusCardProps {
  sessions: Session[]
  onOpenActivityLog?: () => void
  className?: string
}

const RING_RADIUS = 17
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export const SystemStatusCard = memo(function SystemStatusCard({
  sessions = [],
  onOpenActivityLog,
  className = '',
}: SystemStatusCardProps) {
  const { t, lang } = useTranslation()
  const weekDays = useMemo(() => t.weekdays.map((w) => w.charAt(0)), [t.weekdays])
  const streak = currentStreakDays(sessions)
  // Day-granular cache key: `new Date()` inline would defeat the memo below
  // (fresh object identity each render) and go stale after midnight; the key
  // string is stable within a day and changes exactly when it must recompute.
  const todayKey = dayKey(new Date())

  const { dayLogged, activeDaysThisWeek, hasLoggedToday, weekStart, today } =
    useMemo(() => {
      // Reconstructed from the day key (local midnight): sameDay/startOfWeek
      // only compare calendar days, so midnight is exactly equivalent — and the
      // memo now genuinely depends on `todayKey`, recomputing at day rollover.
      const [y, m, d] = todayKey.split('-').map(Number)
      const today = new Date(y, (m ?? 1) - 1, d)
      const weekStart = startOfWeek(today)
      const logged = Array.from({ length: 7 }, (_, i) => {
        const dayDate = addDays(weekStart, i)
        return sessions.some((s) => sameDay(new Date(s.start), dayDate))
      })
      const count = logged.filter(Boolean).length
      const todayActive = sessions.some((s) => sameDay(new Date(s.start), today))

      return {
        dayLogged: logged,
        activeDaysThisWeek: count,
        hasLoggedToday: todayActive,
        weekStart,
        today,
      }
    }, [sessions, todayKey])

  const active = hasLoggedToday

  return (
    <BentoCard
      label={t.dashboard.streak}
      action={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            playMicroClick('tap')
            onOpenActivityLog?.()
          }}
          className="chip"
          title={lang === 'de' ? 'Aktivitätsprotokoll öffnen' : 'Open activity log'}
        >
          {t.dashboard.sessions}
          <ArrowUpRight size={11} />
        </button>
      }
      className={className}
      contentClassName="justify-between gap-4"
    >
      {/* Headline readout + progress ring */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className={`readout text-[clamp(2.5rem,7cqw,3.5rem)]`}>{streak}</span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium text-fg">
              {streak === 1
                ? lang === 'de'
                  ? 'Tag Streak'
                  : 'day streak'
                : lang === 'de'
                  ? 'Tage Streak'
                  : 'day streak'}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {lang === 'de'
                ? active
                  ? 'Status: Aktiv'
                  : 'Status: Bereit'
                : active
                  ? 'Circuit closed'
                  : 'Circuit standby'}
            </span>
          </div>
        </div>

        {/* Nothing OS radial glyph ring — accent-aware, not hardcoded red */}
        <div
          className="relative flex h-12 w-12 shrink-0 select-none items-center justify-center"
          role="img"
          aria-label={`${activeDaysThisWeek} of 7 active days this week`}
        >
          <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
            <circle
              cx="22"
              cy="22"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-fg/10"
            />
            <circle
              cx="22"
              cy="22"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={active ? 'text-accent' : 'text-fg/40'}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={
                RING_CIRCUMFERENCE -
                (RING_CIRCUMFERENCE * Math.min(7, activeDaysThisWeek)) / 7
              }
              style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.32,0.72,0,1)' }}
            />
          </svg>
          <span className="num absolute inset-0 flex items-center justify-center text-[10px] text-muted">
            {activeDaysThisWeek}/7
          </span>
        </div>
      </div>

      {/* 7-day PCB trace — grows into the leftover height so a tall card
          reads as one instrument face instead of three blocks drifting apart
          under `justify-between`. */}
      <div className="flex min-h-[46px] flex-1 items-center py-2">
        <div className="relative grid w-full grid-cols-7">
          {/* Inactive base trace */}
          <div
            aria-hidden="true"
            className="absolute left-[calc(100%/14)] top-[11px] h-px w-[calc(100%-100%/7)] bg-fg/10"
          />

          {/* Connected segments between consecutive logged days */}
          {Array.from({ length: 6 }).map((_, i) =>
            dayLogged[i] && dayLogged[i + 1] ? (
              <div
                key={i}
                aria-hidden="true"
                className="absolute top-[11px] h-px bg-accent transition-colors duration-200"
                style={{
                  left: `${((i + 0.5) / 7) * 100}%`,
                  width: `${(1 / 7) * 100}%`,
                }}
              />
            ) : null,
          )}

          {/* Pads + day labels */}
          {weekDays.map((dayName, i) => {
            const isCurrentDay = sameDay(addDays(weekStart, i), today)
            const hasLogged = dayLogged[i]

            return (
              <div
                key={i}
                title={`${dayName}: ${
                  hasLogged
                    ? lang === 'de'
                      ? 'Erfasst'
                      : 'Logged'
                    : lang === 'de'
                      ? 'Keine Sessions'
                      : 'No sessions'
                }`}
                className="flex flex-col items-center"
              >
                <div className="mb-2 flex items-start">
                  <span
                    className={`mt-[5px] h-3 w-3 shrink-0 rounded-full transition-all duration-200 ${
                      hasLogged
                        ? 'bg-accent'
                        : isCurrentDay
                          ? 'border border-fg bg-transparent'
                          : 'border border-line bg-transparent'
                    }`}
                  />
                </div>
                <span
                  className={`num shrink-0 text-[10px] ${
                    isCurrentDay ? 'text-fg' : 'text-muted'
                  }`}
                >
                  {dayName}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Weekly consistency metric */}
      <div className="flex shrink-0 items-center justify-between border-t border-line/60 pt-2.5 text-xs text-muted">
        <span>{lang === 'de' ? 'Aktive Tage' : 'Active days'}</span>
        <span className="num text-fg/90">
          {lang === 'de'
            ? `${activeDaysThisWeek} von 7`
            : `${activeDaysThisWeek} of 7`}
        </span>
      </div>
    </BentoCard>
  )
})
