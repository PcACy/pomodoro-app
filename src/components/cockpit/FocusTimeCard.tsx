import { memo, useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import type { Session, Settings } from '../../types'
import { currentStreakDays, todayMinutes } from '../../lib/stats'
import { sameDay } from '../../lib/time'
import { BentoCard } from './BentoCard'
import { useTranslation } from '../../hooks/useTranslation'

interface FocusTimeCardProps {
  sessions: Session[]
  settings: Settings
  onOpenSettings?: () => void
  className?: string
}

export const FocusTimeCard = memo(function FocusTimeCard({
  sessions,
  settings,
  onOpenSettings,
  className = '',
}: FocusTimeCardProps) {
  const { t, lang } = useTranslation()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const currentMinutes = todayMinutes(sessions)
  // `??` not `||`: mergeWithDefaults accepts 0 as a valid goal, so `||` mapped it
  // to the default and made the Math.max(15, …) floor dead.
  const targetMinutes = Math.max(15, settings.dailyGoalMinutes ?? 120)
  const hours = (currentMinutes / 60).toFixed(1)
  const targetHours = (targetMinutes / 60).toFixed(1)
  const ratio = Math.max(0, currentMinutes / targetMinutes)
  const clampedPct = Math.min(999, Math.round(ratio * 100))
  const goalReached = ratio >= 1

  const streak = currentStreakDays(sessions)
  const todaySessions = sessions.filter((s) => sameDay(new Date(s.start), now))

  // Current time as fraction of 24h day (0..1)
  const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes()
  const nowFraction = currentMinutesOfDay / 1440
  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })

  const sessionCount = todaySessions.length
  const sessionWord =
    sessionCount === 1
      ? lang === 'de'
        ? 'Session'
        : 'session'
      : lang === 'de'
        ? 'Sessions'
        : 'sessions'

  return (
    <BentoCard
      label={t.dashboard.focusTime || 'Daily Focus'}
      indicator={
        streak > 0 ? (
          <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-line px-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            {streak} {lang === 'de' ? 'Tage' : 'd'}
          </span>
        ) : null
      }
      action={
        onOpenSettings ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenSettings()
            }}
            title={lang === 'de' ? 'Tagesziel anpassen' : 'Edit Daily Goal'}
            aria-label={lang === 'de' ? 'Tagesziel anpassen' : 'Edit Daily Goal'}
            className="icon-btn !h-9 !w-9"
          >
            <SettingsIcon size={14} />
          </button>
        ) : null
      }
      className={className}
      contentClassName="justify-between gap-4"
    >
      {/* Headline readout */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="readout text-[clamp(2.5rem,7cqw,3.5rem)]">{hours}</span>
            <span className="num text-sm text-muted">h</span>
          </div>
          <div className="num mt-1.5 text-xs text-muted">
            {lang === 'de' ? 'Ziel' : 'target'} {targetHours} h
          </div>
        </div>
        <div className="pb-1 text-right">
          <span
            className={`num text-base font-medium ${
              goalReached ? 'text-accent' : 'text-fg'
            }`}
          >
            {clampedPct}%
          </span>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            {sessionCount} {sessionWord}
          </div>
        </div>
      </div>

      {/* 24-Hour timeline — the band grows to fill the panel */}
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="relative min-h-[14px] flex-1 overflow-hidden rounded-control border border-line bg-canvas">
          {/* Quarter-day separators */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex justify-between opacity-50"
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-full w-px bg-line" />
            ))}
          </div>

          {/* Today's session blocks */}
          {todaySessions.map((session) => {
            const startDate = new Date(session.start)
            const startMin = startDate.getHours() * 60 + startDate.getMinutes()
            const durMin = Math.max(2, Math.round(session.durationMs / 60_000))
            const leftPct = (startMin / 1440) * 100
            const widthPct = Math.min(100 - leftPct, (durMin / 1440) * 100)

            return (
              <div
                key={session.id}
                title={`${session.task || 'Session'} (${durMin}m)`}
                className="absolute bottom-0.5 top-0.5 rounded-[1px] bg-fg/85 transition-colors hover:bg-accent"
                style={{
                  left: `${leftPct}%`,
                  width: `${Math.max(0.5, widthPct)}%`,
                }}
              />
            )
          })}

          {/* Nothing red current-time needle */}
          <div
            className="absolute bottom-0 top-0 z-10 w-[2px] bg-accent"
            style={{ left: `${nowFraction * 100}%` }}
            title={lang === 'de' ? `Aktuelle Uhrzeit: ${timeStr}` : `Current time: ${timeStr}`}
          />
        </div>

        {/* Hour axis */}
        <div className="flex shrink-0 items-center justify-between font-mono text-[9px] uppercase tracking-wider text-muted">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span className="text-fg">now {timeStr}</span>
          <span>24</span>
        </div>
      </div>
    </BentoCard>
  )
})
