import { memo, useEffect, useState } from 'react'
import type { Session } from '../../types'
import { BentoCard } from './BentoCard'
import { sameDay } from '../../lib/time'

interface DayFlowCardProps {
  sessions: Session[]
  className?: string
}

export const DayFlowCard = memo(function DayFlowCard({
  sessions,
  className = '',
}: DayFlowCardProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  // Filter sessions for today
  const todaySessions = sessions.filter((s) => sameDay(new Date(s.start), now))
  const totalTodayMinutes = todaySessions.reduce(
    (sum, s) => sum + Math.round(s.durationMs / 60_000),
    0,
  )

  // Current time as fraction of 24h day (0..1)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const nowFraction = currentMinutes / 1440

  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <BentoCard
      label="DAY FLOW"
      action={
        <span className="font-mono text-[9px] text-muted tracking-wider uppercase">
          {todaySessions.length} SESSIONS
        </span>
      }
      className={className}
      contentClassName="justify-between"
    >
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-medium tracking-tight text-fg tabular-nums">
            {Math.floor(totalTodayMinutes / 60)}h {totalTodayMinutes % 60}m
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted tracking-wider uppercase mt-0.5">
          LOGGED TODAY
        </div>
      </div>

      {/* 24-Hour Timeline Bar with Red Needle */}
      <div className="mt-4">
        <div className="relative h-4 w-full rounded-sm bg-canvas border border-line/60 overflow-hidden">
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
                className="absolute top-0.5 bottom-0.5 rounded-[1px] bg-fg/80 hover:bg-fg transition-colors"
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
        <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-muted tracking-wider tabular-nums">
          <span>00:00</span>
          <span>12:00</span>
          <span className="text-fg/80 font-medium">NOW {timeStr}</span>
          <span>24:00</span>
        </div>
      </div>
    </BentoCard>
  )
})

