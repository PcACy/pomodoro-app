import { memo, useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import type { Session, Settings } from '../../types'
import { currentStreakDays, todayMinutes } from '../../lib/stats'
import { sameDay } from '../../lib/time'
import { BentoCard } from './BentoCard'

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
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const currentMinutes = todayMinutes(sessions)
  const targetMinutes = Math.max(15, settings.dailyGoalMinutes || 120)
  const hours = (currentMinutes / 60).toFixed(1)
  const targetHours = (targetMinutes / 60).toFixed(1)
  const ratio = Math.max(0, currentMinutes / targetMinutes)
  const clampedPct = Math.min(999, Math.round(ratio * 100))

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

  return (
    <BentoCard
      label="DAILY FOCUS"
      action={
        <div className="flex items-center gap-1.5">
          {streak > 0 && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border border-line bg-canvas text-fg tracking-wider uppercase">
              {streak}D STREAK
            </span>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenSettings()
              }}
              title="Edit Daily Goal"
              className="text-muted hover:text-fg transition-colors p-0.5 cursor-pointer"
            >
              <SettingsIcon size={12} />
            </button>
          )}
        </div>
      }
      onClick={onOpenSettings}
      className={`${onOpenSettings ? 'cursor-pointer hover:border-fg/30 transition-colors' : ''} ${className}`}
      contentClassName="justify-between"
    >
      {/* Top Value & Percent Summary */}
      <div className="my-auto flex items-baseline justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-sans text-3xl sm:text-4xl font-medium tracking-tight text-fg tabular-nums">
              {hours}
            </span>
            <span className="font-mono text-xs text-muted uppercase">H</span>
          </div>
          <div className="font-mono text-[10px] text-muted tracking-wider uppercase mt-0.5">
            / {targetHours} H TARGET
          </div>
        </div>
        <div className="text-right font-mono">
          <span className="text-xs sm:text-sm font-bold text-fg tabular-nums">{clampedPct}%</span>
          <div className="text-[9px] text-muted tracking-wider uppercase">
            {todaySessions.length} {todaySessions.length === 1 ? 'SESSION' : 'SESSIONS'}
          </div>
        </div>
      </div>

      {/* 24-Hour Timeline Bar with Red Needle */}
      <div className="mt-3">
        <div className="relative h-3 w-full rounded-none bg-canvas border border-line/60 overflow-hidden">
          {/* Hour tick marks */}
          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-30">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-full w-[1px] bg-line" />
            ))}
          </div>

          {/* Render today's session blocks */}
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
                className="absolute top-0.5 bottom-0.5 rounded-none bg-fg/80 hover:bg-fg transition-colors"
                style={{
                  left: `${leftPct}%`,
                  width: `${Math.max(0.5, widthPct)}%`,
                }}
              />
            )
          })}

          {/* Nothing Red Current Time Needle */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-accent z-10"
            style={{ left: `${nowFraction * 100}%` }}
            title={`Current Time: ${timeStr}`}
          />
        </div>

        {/* Hour Axis Labels */}
        <div className="mt-1 flex items-center justify-between font-mono text-[8px] sm:text-[9px] text-muted tracking-wider tabular-nums">
          <span>00:00</span>
          <span>12:00</span>
          <span className="text-muted font-medium">NOW {timeStr}</span>
          <span>24:00</span>
        </div>
      </div>
    </BentoCard>
  )
})
