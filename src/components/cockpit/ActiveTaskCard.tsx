import { memo } from 'react'
import { Check } from 'lucide-react'
import type { Session, TodoItem } from '../../types'
import { BentoCard } from './BentoCard'
import { getTagColor } from '../TodoList'
import { useTimerTick } from '../../hooks/useTimerTick'
import { playMicroClick } from '../../lib/sound'

interface ActiveTaskCardProps {
  activeTodo: TodoItem | null
  isRunning: boolean
  remainingMs: number
  totalMs: number
  time?: string
  sessions?: Session[]
  focusMinutes?: number
  onOpenTodoManager?: () => void
  onToggleDone?: (id: string) => void
  className?: string
}

export const ActiveTaskCard = memo(function ActiveTaskCard({
  activeTodo,
  isRunning,
  remainingMs,
  totalMs,
  time = '25:00',
  sessions,
  focusMinutes = 25,
  onOpenTodoManager,
  onToggleDone,
  className = '',
}: ActiveTaskCardProps) {
  const timerTick = useTimerTick()
  const liveRemainingMs = isRunning ? timerTick.remainingMs : remainingMs
  const liveTime = isRunning ? (timerTick.time || time) : time

  const elapsedMs = Math.max(0, totalMs - liveRemainingMs)
  const elapsedMinutes = Math.floor(elapsedMs / 60_000)
  const elapsedSeconds = Math.floor((elapsedMs % 60_000) / 1000)
  const elapsedStr = `${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedSeconds).padStart(2, '0')}`

  const totalMinutes = Math.floor(totalMs / 60_000)
  const totalSeconds = Math.floor((totalMs % 60_000) / 1000)
  const totalStr = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`

  const progressRatio = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 0
  const tagColor = activeTodo?.tag ? getTagColor(activeTodo.tag) : undefined

  const taskMinutes = activeTodo && sessions
    ? sessions
        .filter((s) => s.task && s.task.trim().toLowerCase() === activeTodo.title.trim().toLowerCase())
        .reduce((sum, s) => sum + Math.round(s.durationMs / 60_000), 0)
    : 0
  const minutesPerPomodoro = Number.isFinite(focusMinutes) && focusMinutes > 0 ? focusMinutes : 25
  const displayMinutes = taskMinutes > 0 ? taskMinutes : (activeTodo ? activeTodo.pomodoros * minutesPerPomodoro : 0)

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

        {/* Right side: Task focus metric + Quick Done action */}
        {activeTodo ? (
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col items-end text-right font-mono">
              <span className="text-xs text-fg font-medium tabular-nums">
                {displayMinutes} MIN
              </span>
              <span className="text-[9px] text-muted uppercase tracking-wider">
                FOCUSED
              </span>
            </div>

            {onToggleDone && (
              <button
                type="button"
                onClick={() => {
                  playMicroClick('tick')
                  onToggleDone(activeTodo.id)
                }}
                className="h-8 px-3 rounded-full border border-line bg-canvas hover:border-fg/50 text-fg text-xs font-mono tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Mark task as completed"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>DONE</span>
              </button>
            )}
          </div>
        ) : (
          <div className="shrink-0 flex items-center">
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase px-2.5 py-1 rounded border border-line/40 bg-canvas/30">
              READY
            </span>
          </div>
        )}
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
          <span className="text-fg/80 font-medium">{liveTime}</span>
          <span>{totalStr}</span>
        </div>
      </div>
    </BentoCard>
  )
})
