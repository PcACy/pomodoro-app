import { memo, useEffect, useState } from 'react'
import type { TodoItem } from '../../types'
import { BentoCard } from './BentoCard'
import { getTagColor } from '../TodoList'

interface ActiveTaskCardProps {
  activeTodo: TodoItem | null
  isRunning: boolean
  remainingMs: number
  totalMs: number
  time: string
  onOpenTodoManager?: () => void
  className?: string
}

const BAR_COUNT = 24

export const ActiveTaskCard = memo(function ActiveTaskCard({
  activeTodo,
  isRunning,
  remainingMs,
  totalMs,
  time,
  onOpenTodoManager,
  className = '',
}: ActiveTaskCardProps) {
  // Waveform visualization bars animation
  const [waveHeights, setWaveHeights] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, (_, i) => 20 + Math.sin(i * 0.8) * 15),
  )

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setWaveHeights(
        Array.from({ length: BAR_COUNT }, (_, i) => {
          // Dynamic pseudo-audio frequency animation
          const t = Date.now() / 200
          const base = Math.sin(i * 0.5 + t) * 30 + Math.cos(i * 0.8 - t * 0.7) * 20
          return Math.max(12, Math.min(95, Math.abs(base) + 15))
        }),
      )
    }, 120)
    return () => clearInterval(interval)
  }, [isRunning])

  const elapsedMs = Math.max(0, totalMs - remainingMs)
  const elapsedMinutes = Math.floor(elapsedMs / 60_000)
  const elapsedSeconds = Math.floor((elapsedMs % 60_000) / 1000)
  const elapsedStr = `${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedSeconds).padStart(2, '0')}`

  const totalMinutes = Math.floor(totalMs / 60_000)
  const totalSeconds = Math.floor((totalMs % 60_000) / 1000)
  const totalStr = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`

  const progressRatio = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 0
  const tagColor = activeTodo?.tag ? getTagColor(activeTodo.tag) : undefined

  return (
    <BentoCard
      label="ACTIVE TASK"
      action={
        activeTodo ? (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-line bg-canvas text-fg tracking-wider uppercase">
            {activeTodo.pomodoros} POMOS
          </span>
        ) : (
          <button
            type="button"
            onClick={onOpenTodoManager}
            className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-line bg-canvas text-muted hover:text-fg hover:border-fg/40 tracking-wider uppercase transition-colors cursor-pointer"
          >
            + ASSIGN
          </button>
        )
      }
      className={className}
      contentClassName="justify-between"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Task Title & Details */}
        <div className="min-w-0 flex-1">
          <h3 className="font-sans font-medium text-lg sm:text-xl text-fg truncate">
            {activeTodo?.title || 'No active task selected'}
          </h3>
          <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted tracking-wider uppercase">
            {activeTodo?.tag ? (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tagColor }}
                />
                <span className="text-fg/80">{activeTodo.tag}</span>
              </span>
            ) : (
              <span>UNTAGGED</span>
            )}
            <span>·</span>
            <span>{isRunning ? 'IN PROGRESS' : 'STANDBY'}</span>
          </div>
        </div>

        {/* Audio-Style Waveform Visualizer */}
        <div
          className="flex items-end gap-[2px] h-10 shrink-0 px-2 py-1 rounded bg-canvas/60 border border-line/40"
          aria-hidden="true"
        >
          {waveHeights.map((h, i) => (
            <div
              key={i}
              className={`w-[2px] rounded-full transition-all duration-100 ${
                isRunning
                  ? i % 4 === 0
                    ? 'bg-accent'
                    : 'bg-fg'
                  : 'bg-line/60'
              }`}
              style={{
                height: isRunning ? `${h}%` : `${15 + (i % 5) * 5}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Scrubber / Progress Bar with Timestamps */}
      <div className="mt-4">
        <div className="relative h-1 w-full bg-line/40 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 bottom-0 left-0 transition-all duration-200 ${
              isRunning ? 'bg-accent' : 'bg-fg'
            }`}
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-muted tracking-wider tabular-nums">
          <span>{elapsedStr}</span>
          <span className="text-fg/80 font-medium">{time}</span>
          <span>{totalStr}</span>
        </div>
      </div>
    </BentoCard>
  )
})
