import { memo } from 'react'
import { BentoCard } from './BentoCard'

interface CycleBatteryCardProps {
  completedFocusInCycle: number
  roundsBeforeLongBreak: number
  className?: string
}

const TOTAL_SEGMENTS = 10

export const CycleBatteryCard = memo(function CycleBatteryCard({
  completedFocusInCycle,
  roundsBeforeLongBreak,
  className = '',
}: CycleBatteryCardProps) {
  const currentCompleted = roundsBeforeLongBreak > 0
    ? completedFocusInCycle % roundsBeforeLongBreak
    : 0
  const ratio = roundsBeforeLongBreak > 0 ? currentCompleted / roundsBeforeLongBreak : 0
  const percentage = Math.round(ratio * 100)

  const filledSegments = Math.round(ratio * TOTAL_SEGMENTS)
  const remainingRounds = Math.max(0, roundsBeforeLongBreak - currentCompleted)

  return (
    <BentoCard
      label="CYCLE BATTERY"
      className={className}
      contentClassName="justify-between"
    >
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-medium tracking-tight text-fg tabular-nums">
            {percentage}
          </span>
          <span className="font-mono text-xs text-muted uppercase">%</span>
        </div>
        <div className="font-mono text-[10px] text-muted tracking-wider uppercase mt-0.5">
          {currentCompleted} OF {roundsBeforeLongBreak} COMPLETED
        </div>
      </div>

      {/* Segmented Battery Meter with Terminal Cap */}
      <div className="mt-3">
        <div className="flex items-center gap-1">
          {/* Battery Body with Segments */}
          <div className="flex-1 flex h-3 gap-0.5 p-0.5 rounded-sm bg-canvas border border-line">
            {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-[0.5px] transition-colors duration-150 ${
                  i < filledSegments
                    ? 'bg-fg'
                    : 'bg-line/40'
                }`}
              />
            ))}
          </div>
          {/* Battery Positive Terminal Cap */}
          <div className="h-1.5 w-0.5 rounded-r-[0.5px] bg-line" />
        </div>

        {/* Next Milestone Subtitle */}
        <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-muted tracking-wider uppercase">
          <span>{remainingRounds <= 1 ? 'LONG BREAK NEXT' : `~ ${remainingRounds * 25}M TO LONG BREAK`}</span>
        </div>
      </div>
    </BentoCard>
  )
})
