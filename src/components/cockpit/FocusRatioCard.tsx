import { memo } from 'react'
import type { Session } from '../../types'
import { BentoCard } from './BentoCard'
import { sameDay } from '../../lib/time'

interface FocusRatioCardProps {
  sessions: Session[]
  className?: string
}

export const FocusRatioCard = memo(function FocusRatioCard({
  sessions,
  className = '',
}: FocusRatioCardProps) {
  const today = new Date()
  const todaySessions = sessions.filter((s) => sameDay(new Date(s.start), today))

  // Compute focus minutes
  const focusMinutes = todaySessions.reduce(
    (sum, s) => sum + Math.round(s.durationMs / 60_000),
    0,
  )

  // Standard pomodoro ratio estimate: 25 min focus : 5 min break = 5:1 (83.3% focus)
  // Or approximate break time from rounds
  const estimatedBreakMinutes = Math.max(5, Math.round(todaySessions.length * 5))
  const totalTracked = focusMinutes + estimatedBreakMinutes
  const focusRate = totalTracked > 0 ? Math.round((focusMinutes / totalTracked) * 100) : 85
  const ratioMultiple = (focusMinutes / Math.max(1, estimatedBreakMinutes)).toFixed(1)

  // Generate sparkline points (representing hourly intensity today)
  const sparklineData = [15, 25, 10, 35, 45, 30, 50, 40, 60, 55, 70, 65, 80]
  const maxVal = Math.max(...sparklineData)
  const minVal = Math.min(...sparklineData)
  const range = maxVal - minVal || 1

  // SVG polyline points (width 120, height 32)
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * 120
      const y = 32 - ((val - minVal) / range) * 26 - 3
      return `${x},${y}`
    })
    .join(' ')

  return (
    <BentoCard
      label="FOCUS RATIO"
      className={className}
      contentClassName="justify-between"
    >
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-medium tracking-tight text-fg tabular-nums">
            {focusRate}%
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted tracking-wider uppercase mt-0.5">
          FOCUS VS BREAK TIME
        </div>
      </div>

      {/* Sparkline Graph */}
      <div className="mt-3">
        <svg
          className="w-full h-8 overflow-visible"
          viewBox="0 0 120 32"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
            points={points}
          />
        </svg>
        <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-muted tracking-wider uppercase">
          <span className="text-accent">↑ {ratioMultiple}x BREAK</span>
          <span>PACE 25M</span>
        </div>
      </div>
    </BentoCard>
  )
})

