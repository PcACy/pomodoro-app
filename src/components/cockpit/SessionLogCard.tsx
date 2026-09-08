import { memo, useMemo } from 'react'
import { ArrowUpRight, Clock } from 'lucide-react'
import type { Session } from '../../types'
import { BentoCard } from './BentoCard'
import { playMicroClick } from '../../lib/sound'

interface SessionLogCardProps {
  sessions: Session[]
  onOpenAnalyticsModal: () => void
  className?: string
}

function formatSessionTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const SessionLogCard = memo(function SessionLogCard({
  sessions,
  onOpenAnalyticsModal,
  className = '',
}: SessionLogCardProps) {
  const { todaySessions, totalMinutesToday } = useMemo(() => {
    const todayStr = new Date().toDateString()
    const filtered = sessions.filter((s) => {
      const d = new Date(s.start)
      return d.toDateString() === todayStr
    })
    // Sort descending by start time (newest first)
    filtered.sort((a, b) => b.start - a.start)
    const minutes = Math.round(
      filtered.reduce((acc, s) => acc + (s.durationMs || 0), 0) / 60000
    )
    return { todaySessions: filtered, totalMinutesToday: minutes }
  }, [sessions])

  const sessionCount = todaySessions.length
  const totalHours = (totalMinutesToday / 60).toFixed(1)

  return (
    <BentoCard
      label="SESSION LOG // TODAY"
      indicator={
        <span className="font-mono text-[10px] text-muted/70 tracking-wider">
          {sessionCount} SESS · {totalHours}H
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => {
            playMicroClick('tap')
            onOpenAnalyticsModal()
          }}
          className="flex items-center gap-1 font-mono text-[10px] text-muted hover:text-fg transition-colors tracking-wider uppercase cursor-pointer"
        >
          <span>STATS</span>
          <ArrowUpRight size={11} />
        </button>
      }
      className={className}
    >
      {todaySessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8 text-center text-muted select-none">
          <div className="h-10 w-10 rounded-full border border-dashed border-line flex items-center justify-center mb-3">
            <Clock size={16} className="text-muted/60" />
          </div>
          <span className="font-mono text-xs tracking-wider uppercase text-fg">
            NO SESSIONS RECORDED TODAY
          </span>
          <span className="font-mono text-[10px] text-muted/60 mt-1 max-w-[240px]">
            START A FOCUS ROUND ABOVE TO LOG ACTIVITY
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1 justify-between">
          <div className="flex flex-col gap-2">
            {todaySessions.slice(0, 4).map((s) => {
              const durationMin = Math.max(1, Math.round(s.durationMs / 60000))
              const isFlow = s.mode === 'flow'
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded border border-line/60 bg-canvas/40 hover:border-line transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[11px] text-muted tabular-nums shrink-0">
                      {formatSessionTime(s.start)}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-line bg-surface text-muted shrink-0">
                      {isFlow ? 'FLOW' : 'POMO'}
                    </span>
                    <span className="font-sans text-xs text-fg font-medium truncate">
                      {s.task || 'Focus Session'}
                    </span>
                    {s.tag && (
                      <span className="hidden sm:inline-block font-mono text-[10px] text-muted shrink-0">
                        #{s.tag}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-fg tabular-nums shrink-0">
                    {durationMin}M
                  </span>
                </div>
              )
            })}
          </div>

          {todaySessions.length > 4 && (
            <button
              type="button"
              onClick={() => {
                playMicroClick('tap')
                onOpenAnalyticsModal()
              }}
              className="mt-2 text-center font-mono text-[10px] text-muted hover:text-fg tracking-wider uppercase py-1 cursor-pointer transition-colors"
            >
              + {todaySessions.length - 4} MORE IN ANALYTICS ↗
            </button>
          )}
        </div>
      )}
    </BentoCard>
  )
})

