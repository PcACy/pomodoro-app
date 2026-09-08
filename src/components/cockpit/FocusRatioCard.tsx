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

  const hasData = todaySessions.length > 0
  const estimatedBreakMinutes = hasData ? Math.round(todaySessions.length * 5) : 0
  const totalTracked = focusMinutes + estimatedBreakMinutes
  const focusRate = totalTracked > 0 ? Math.round((focusMinutes / totalTracked) * 100) : 0
  const ratioMultiple = estimatedBreakMinutes > 0
    ? (focusMinutes / estimatedBreakMinutes).toFixed(1)
    : focusMinutes > 0
      ? '5.0'
      : '0.0'

  // Aggregate into 12 two-hour daytime buckets across 24h
  const hourlyBuckets = Array.from({ length: 12 }, () => 0)
  if (hasData) {
    for (const s of todaySessions) {
      const hour = new Date(s.start).getHours()
      const bucket = Math.min(11, Math.floor(hour / 2))
      hourlyBuckets[bucket] += Math.round(s.durationMs / 60_000)
    }
  }

  const maxVal = Math.max(...hourlyBuckets, 1)
  const peakMinutes = Math.max(...hourlyBuckets)

  // SVG polyline points (width 120, height 32, baseline y = 28)
  const points = hasData
    ? hourlyBuckets
        .map((val, idx) => {
          const x = (idx / 11) * 120
          const y = 28 - (val / maxVal) * 22
          return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
    : '0,28 120,28'

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
            strokeWidth={hasData ? 1.5 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={hasData ? 'text-accent' : 'text-line/60'}
            points={points}
          />
        </svg>
        <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-muted tracking-wider uppercase">
          <span className={hasData ? 'text-accent' : 'text-muted'}>
            {hasData ? `↑ ${ratioMultiple}x BREAK` : '0.0x BREAK'}
          </span>
          <span>{hasData ? `PEAK ${peakMinutes}M` : 'STANDBY'}</span>
        </div>
      </div>
    </BentoCard>
  )
})

