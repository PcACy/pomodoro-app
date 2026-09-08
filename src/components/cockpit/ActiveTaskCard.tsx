import { memo } from 'react'
import { ArrowUpFromLine, Square } from 'lucide-react'
import type { Session, TodoItem, TimerMode } from '../../types'
import { BentoCard } from './BentoCard'
import { getTagColor } from '../TodoList'
import { useFlowTimerTick } from '../../hooks/useTimerTick'
import { playMicroClick } from '../../lib/sound'

interface ActiveTaskCardProps {
  activeTodo: TodoItem | null
  todos?: TodoItem[]
  isRunning: boolean
  remainingMs: number
  totalMs: number
  mode?: TimerMode
  sessions?: Session[]
  focusMinutes?: number
  onOpenTodoManager?: () => void
  onToggleDone?: (id: string) => void
  onFocus?: (id: string) => void
  className?: string
}

// One pick row: fixed height so every slot state stays pixel-identical.
function PickRow({ todo, onFocus }: { todo: TodoItem; onFocus?: (id: string) => void }) {
  return (
    <li className="flex h-[40px] items-center justify-between gap-3">
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
        className="shrink-0 font-mono text-[10px] tracking-widest uppercase text-muted hover:text-fg transition-colors cursor-pointer px-2 min-h-[40px]"
      >
        FOCUS
      </button>
    </li>
  )
}

// Fixed-height pick slot: label + exactly one 40px next-track row —
// total card height stays compact and never moves.
const SLOT_ROWS = 1

// Stylized tape reel: static tape-pack ring (width = remaining tape) with a
// rotating 3-spoke hub on top. Pure outline geometry, no glow.
function Reel({
  packWidth,
  spinning,
  reverse = false,
  dim = false,
}: {
  packWidth: number
  spinning: boolean
  reverse?: boolean
  dim?: boolean
}) {
  return (
    <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0" aria-hidden="true">
      {/* Tape pack: static ring, width grows/shrinks as tape winds */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="currentColor"
          strokeWidth={packWidth}
          className={dim ? 'text-line/60' : 'text-fg/80'}
        />
      </svg>
      {/* Hub + spokes: rotates while the deck is running */}
      <svg
        viewBox="0 0 64 64"
        className={`absolute inset-0 h-full w-full animate-spin [animation-duration:3.5s] ${
          reverse ? '[animation-direction:reverse]' : ''
        } ${spinning ? '' : '[animation-play-state:paused]'}`}
      >
        <circle cx="32" cy="32" r="17" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg/50" />
        {[0, 120, 240].map((deg) => (
          <line
            key={deg}
            x1="32"
            y1="32"
            x2={32 + 13 * Math.cos(((deg - 90) * Math.PI) / 180)}
            y2={32 + 13 * Math.sin(((deg - 90) * Math.PI) / 180)}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-fg/50"
          />
        ))}
        <circle cx="32" cy="32" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-fg" />
      </svg>
    </div>
  )
}

export const ActiveTaskCard = memo(function ActiveTaskCard({
  activeTodo,
  todos = [],
  isRunning,
  remainingMs,
  totalMs,
  mode = 'pomodoro',
  sessions,
  focusMinutes = 25,
  onOpenTodoManager,
  onToggleDone,
  onFocus,
  className = '',
}: ActiveTaskCardProps) {
  const flowTick = useFlowTimerTick()
  const isFlowMode = mode === 'flow'
  const tagColor = activeTodo?.tag ? getTagColor(activeTodo.tag) : undefined

  // Tape position: elapsed / total. Flow has no fixed length — packs rest
  // centered while the counter runs up.
  const elapsedMs = activeTodo
    ? isFlowMode
      ? Math.max(0, flowTick.elapsedMs)
      : Math.max(0, totalMs - remainingMs)
    : 0
  const ratio = activeTodo && !isFlowMode && totalMs > 0
    ? Math.min(1, Math.max(0, elapsedMs / totalMs))
    : 0.5
  const hasProgress = elapsedMs > 0
  const spinning = isRunning && activeTodo != null

  // Mechanical 3-digit tape counter: elapsed session minutes, 000–999.
  const counterDigits = String(Math.min(999, Math.floor(elapsedMs / 60_000)))
    .padStart(3, '0')
    .split('')

  const taskMinutes = activeTodo && sessions
    ? sessions
        .filter((s) => s.task && s.task.trim().toLowerCase() === activeTodo.title.trim().toLowerCase())
        .reduce((sum, s) => sum + Math.round(s.durationMs / 60_000), 0)
    : 0
  const minutesPerPomodoro = Number.isFinite(focusMinutes) && focusMinutes > 0 ? focusMinutes : 25
  const displayMinutes = taskMinutes > 0 ? taskMinutes : (activeTodo ? activeTodo.pomodoros * minutesPerPomodoro : 0)

  const openTodos = todos.filter((x) => !x.done)
  // Focused: offer the other open todos as tape switch. Empty: quick-pick.
  // Either way the slot below renders exactly SLOT_ROWS rows.
  const pickPool = activeTodo ? openTodos.filter((x) => x.id !== activeTodo.id) : openTodos
  const pickTodos = pickPool.slice(0, SLOT_ROWS)
  const remainingPickCount = pickPool.length - pickTodos.length
  const fillerCount = Math.max(0, SLOT_ROWS - pickTodos.length)

  // Left reel unwinds (ring thins), right reel takes up (ring thickens).
  const leftPack = 1.5 + 4.5 * (1 - ratio)
  const rightPack = 1.5 + 4.5 * ratio

  return (
    <BentoCard
      label="TRACK 01 // TAPE DECK"
      action={
        isRunning ? (
          <span className="h-5 min-w-[72px] inline-flex items-center justify-center gap-1.5 px-2.5 font-mono text-[9px] leading-none tracking-widest uppercase rounded-full border border-accent/60 text-accent bg-accent/10">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse [animation-duration:1s] shrink-0" />
            <span>REC</span>
          </span>
        ) : (
          <span className="h-5 min-w-[72px] inline-flex items-center justify-center px-2.5 font-mono text-[9px] leading-none tracking-widest uppercase rounded-full border border-line text-muted bg-canvas">
            {hasProgress ? '|| PAUSE' : 'STBY'}
          </span>
        )
      }
      className={className}
      contentClassName="justify-between"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Track info */}
        <div className="min-w-0 flex-1">
          <h3 className={`font-sans font-medium text-lg sm:text-xl truncate ${activeTodo ? 'text-fg' : 'text-muted'}`}>
            {activeTodo?.title || '[ NO TAPE INSERTED // SELECT TASK ]'}
          </h3>
          <div className="mt-1 h-5 flex items-center gap-2 font-mono text-[10px] text-muted tracking-wider uppercase leading-none">
            {activeTodo?.tag ? (
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2 py-px">
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
            <span>{activeTodo ? (isRunning ? 'IN PROGRESS' : 'STANDBY') : isRunning ? 'FREE SESSION' : 'STANDBY'}</span>
          </div>

          {/* Mechanical tape counter */}
          <div className="mt-3 flex items-center gap-2.5">
            <div
              className="flex rounded border border-fg/20 bg-black divide-x divide-white/10 overflow-hidden"
              role="status"
              aria-label={`Tape counter: ${counterDigits.join('')} minutes elapsed`}
            >
              {counterDigits.map((d, i) => (
                <span
                  key={i}
                  className="w-5 py-1 text-center font-mono text-sm font-medium tabular-nums text-white"
                >
                  {d}
                </span>
              ))}
            </div>
            <span className="font-mono text-[9px] text-muted tracking-wider uppercase tabular-nums">
              {activeTodo ? `${displayMinutes} MIN FOCUSED` : 'COUNTER'}
            </span>
          </div>
        </div>

        {/* Dual reels in cassette window */}
        <div className="shrink-0 rounded-xl border border-black/10 bg-black/[0.02] p-2 dark:border-white/5 dark:bg-white/[0.02]">
          <div className="flex items-center gap-1.5 sm:gap-2 text-fg">
            <Reel packWidth={activeTodo ? leftPack : 1.5} spinning={spinning} dim={!activeTodo} />
            <Reel packWidth={activeTodo ? rightPack : 1.5} spinning={spinning} reverse dim={!activeTodo} />
          </div>
          {/* Tape path + head */}
          <div className="relative mt-1.5 h-3" aria-hidden="true">
            <div className="absolute left-3 right-3 top-0 h-px bg-fg/20" />
            <div className="absolute left-1/2 top-[3px] flex -translate-x-1/2 items-end gap-[3px]">
              <span className="h-1.5 w-px bg-fg/30" />
              <span className="h-[5px] w-2.5 rounded-[1px] border border-fg/30 bg-canvas" />
              <span className="h-1.5 w-px bg-fg/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Transport keys */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            playMicroClick('toggle')
            onOpenTodoManager?.()
          }}
          title={activeTodo ? 'Change tape' : 'Insert tape'}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-canvas font-mono text-[11px] tracking-widest uppercase text-muted transition-colors hover:border-fg/40 hover:text-fg active:translate-y-px cursor-pointer"
        >
          <ArrowUpFromLine size={13} />
          <span>{activeTodo ? 'EJECT' : 'INSERT'}</span>
        </button>
        {activeTodo && onToggleDone && (
          <button
            type="button"
            onClick={() => {
              playMicroClick('tick')
              onToggleDone(activeTodo.id)
            }}
            title="Stop and complete track"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-canvas font-mono text-[11px] tracking-widest uppercase text-fg transition-colors hover:bg-fg hover:text-canvas hover:border-fg active:translate-y-px cursor-pointer"
          >
            <Square size={11} />
            <span>DONE</span>
          </button>
        )}
      </div>

      {/* Pick slot: fixed label + exactly 3 rows + footer — height never moves */}
      <div className="mt-3 border-t border-line/60 pt-1">
        <div className="flex h-5 items-center justify-between font-mono text-[9px] tracking-widest uppercase">
          <span className="text-muted">
            {activeTodo ? 'UP NEXT // SWITCH TAPE' : 'LOAD TAPE // QUICK PICK'}
          </span>
          {remainingPickCount > 0 ? (
            <button
              type="button"
              onClick={onOpenTodoManager}
              className="text-muted hover:text-fg transition-colors cursor-pointer"
            >
              +{remainingPickCount} MORE
            </button>
          ) : (
            <span aria-hidden="true" className="invisible">
              +0 MORE
            </span>
          )}
        </div>
        {pickPool.length === 0 ? (
          <p className="flex h-[40px] items-center font-mono text-[10px] tracking-wider uppercase text-muted">
            {activeTodo ? 'NO OTHER TAPES QUEUED' : 'NO OPEN TASKS — ADD ONE IN [TASK INBOX]'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {pickTodos.map((todo) => (
              <PickRow key={todo.id} todo={todo} onFocus={onFocus} />
            ))}
            {Array.from({ length: fillerCount }).map((_, i) => (
              <li key={`filler-${i}`} aria-hidden="true" className="h-[40px]" />
            ))}
          </ul>
        )}
      </div>
    </BentoCard>
  )
})
