import { memo } from 'react'
import { Check } from 'lucide-react'
import type { Session, TodoItem, TimerMode } from '../../types'
import { BentoCard } from './BentoCard'
import { getTagColor } from '../TodoList'
import { useFlowTimerTick, useTimerTick } from '../../hooks/useTimerTick'
import { playMicroClick } from '../../lib/sound'

interface ActiveTaskCardProps {
  activeTodo: TodoItem | null
  todos?: TodoItem[]
  isRunning: boolean
  remainingMs: number
  totalMs: number
  time?: string
  mode?: TimerMode
  sessions?: Session[]
  focusMinutes?: number
  onOpenTodoManager?: () => void
  onToggleDone?: (id: string) => void
  onFocus?: (id: string) => void
  className?: string
}

export const ActiveTaskCard = memo(function ActiveTaskCard({
  activeTodo,
  todos = [],
  isRunning,
  remainingMs,
  totalMs,
  time = '25:00',
  mode = 'pomodoro',
  sessions,
  focusMinutes = 25,
  onOpenTodoManager,
  onToggleDone,
  onFocus,
  className = '',
}: ActiveTaskCardProps) {
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()
  const isFlowMode = mode === 'flow'
  // The pomodoro tick is meaningless in flow mode (and vice versa): only use
  // the tick of the active mode, otherwise the bar counts the wrong clock.
  const liveRemainingMs = !isFlowMode && isRunning ? timerTick.remainingMs : remainingMs
  const liveTime = !isFlowMode && isRunning ? (timerTick.time || time) : time

  const elapsedMs = isFlowMode
    ? Math.max(0, flowTick.elapsedMs)
    : Math.max(0, totalMs - liveRemainingMs)
  const elapsedMinutes = Math.floor(elapsedMs / 60_000)
  const elapsedSeconds = Math.floor((elapsedMs % 60_000) / 1000)
  const elapsedStr = `${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedSeconds).padStart(2, '0')}`

  const totalMinutes = Math.floor(totalMs / 60_000)
  const totalSeconds = Math.floor((totalMs % 60_000) / 1000)
  const totalStr = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`

  // Paused-session percentage for the center status readout (number only —
  // the session progress bar lives exclusively in the Hero card).
  const pausedPct = isFlowMode || totalMs <= 0
    ? 0
    : Math.round((Math.min(1, Math.max(0, elapsedMs / totalMs))) * 100)
  const tagColor = activeTodo?.tag ? getTagColor(activeTodo.tag) : undefined

  const taskMinutes = activeTodo && sessions
    ? sessions
        .filter((s) => s.task && s.task.trim().toLowerCase() === activeTodo.title.trim().toLowerCase())
        .reduce((sum, s) => sum + Math.round(s.durationMs / 60_000), 0)
    : 0
  const minutesPerPomodoro = Number.isFinite(focusMinutes) && focusMinutes > 0 ? focusMinutes : 25
  const displayMinutes = taskMinutes > 0 ? taskMinutes : (activeTodo ? activeTodo.pomodoros * minutesPerPomodoro : 0)

  const openTodos = todos.filter((x) => !x.done)
  const quickPick = openTodos.slice(0, 3)
  const remainingPickCount = openTodos.length - quickPick.length

  const centerStatus = isRunning
    ? isFlowMode
      ? `+${flowTick.time}`
      : `-${liveTime}`
    : pausedPct > 0
      ? `${pausedPct}%`
      : 'STANDBY'

  return (
    <BentoCard
      label="ACTIVE TASK"
      action={
        activeTodo ? (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-line bg-canvas text-fg tracking-wider uppercase">
            {activeTodo.pomodoros} POMOS
          </span>
        ) : null
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
                  style={{
                    backgroundColor: tagColor,
                  }}
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
                className="min-h-[44px] px-4 rounded-full border border-line bg-canvas hover:border-fg/50 text-fg text-xs font-mono tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Mark task as completed"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>DONE</span>
              </button>
            )}
          </div>
        ) : (
          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={onOpenTodoManager}
              className="font-mono text-[10px] text-fg tracking-widest uppercase px-4 min-h-[44px] rounded-full border border-fg/40 hover:border-fg bg-canvas transition-colors cursor-pointer"
            >
              ASSIGN TASK
            </button>
          </div>
        )}
      </div>

      {/* Quick-pick: one-click focus for the next open todos (no modal needed) */}
      {!activeTodo && quickPick.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line/60">
          {quickPick.map((todo) => (
            <li key={todo.id} className="flex items-center justify-between gap-3 py-2">
              <button
                type="button"
                onClick={() => {
                  playMicroClick('tap')
                  onFocus?.(todo.id)
                }}
                className="min-w-0 flex-1 text-left group cursor-pointer"
                title={`Focus ${todo.title}`}
              >
                <span className="block truncate font-sans text-sm text-fg/90 group-hover:text-fg transition-colors">
                  {todo.title}
                </span>
                <span className="block font-mono text-[9px] text-muted tracking-wider uppercase truncate">
                  {todo.tag || 'UNTAGGED'} · {todo.pomodoros} POMOS
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playMicroClick('tick')
                  onFocus?.(todo.id)
                }}
                className="shrink-0 font-mono text-[10px] tracking-widest uppercase text-muted hover:text-fg transition-colors cursor-pointer px-2 py-2 min-h-[44px]"
              >
                FOCUS
              </button>
            </li>
          ))}
        </ul>
      )}
      {!activeTodo && quickPick.length > 0 && remainingPickCount > 0 && (
        <button
          type="button"
          onClick={onOpenTodoManager}
          className="mt-1 font-mono text-[10px] tracking-widest uppercase text-muted hover:text-fg transition-colors cursor-pointer text-left"
        >
          +{remainingPickCount} MORE
        </button>
      )}
      {!activeTodo && openTodos.length === 0 && (
        <p className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[10px] tracking-wider uppercase text-muted">
          NO OPEN TASKS — ADD ONE IN [TASK INBOX]
        </p>
      )}

      {/* Elapsed / Status / Total readout (number only — no progress visualization) */}
      <div className="mt-4">
        <div className="flex items-start justify-between font-mono tabular-nums">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm text-fg font-medium">{elapsedStr}</span>
            <span className="text-[8px] text-muted tracking-wider uppercase">ELAPSED</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-muted tracking-wider uppercase">{centerStatus}</span>
            <span className="text-[8px] text-muted/70 tracking-wider uppercase">STATUS</span>
          </span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-sm text-muted">{isFlowMode ? flowTick.time : totalStr}</span>
            <span className="text-[8px] text-muted/70 tracking-wider uppercase">TOTAL</span>
          </span>
        </div>
      </div>
    </BentoCard>
  )
})
