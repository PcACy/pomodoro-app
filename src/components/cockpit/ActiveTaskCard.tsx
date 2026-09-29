import { memo, useEffect, useMemo, useState } from 'react'
import { ArrowUpFromLine, Square } from 'lucide-react'
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
  mode?: TimerMode
  sessions?: Session[]
  focusMinutes?: number
  onOpenTodoManager?: () => void
  onOpenTodoDeck?: () => void
  onToggleDone?: (id: string) => void
  onFocus?: (id: string) => void
  className?: string
}

// One pick row: touch-friendly height (min 44px) so slot state stays accessible.
function PickRow({ todo, onFocus }: { todo: TodoItem; onFocus?: (id: string) => void }) {
  return (
    <li className="flex min-h-[44px] items-center gap-3">
      <button
        type="button"
        onClick={() => {
          playMicroClick('tap')
          onFocus?.(todo.id)
        }}
        className="group min-w-0 flex-1 cursor-pointer py-1 text-left"
        title={`Focus ${todo.title}`}
      >
        <span className="block truncate text-sm text-fg/90 transition-colors group-hover:text-fg">
          {todo.title}
        </span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted">
          {todo.tag || 'Untagged'} · {todo.pomodoros}{' '}
          {todo.pomodoros === 1 ? 'pomo' : 'pomos'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          playMicroClick('tick')
          onFocus?.(todo.id)
        }}
        className="chip h-9 shrink-0 active:scale-[0.97]"
      >
        Focus
      </button>
    </li>
  )
}


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
    <div
      className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16"
      aria-hidden="true"
    >
      {/* Tape pack: static ring, width grows/shrinks as tape winds */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="currentColor"
          strokeWidth={packWidth}
          className={dim ? 'text-fg/15' : 'text-fg/70'}
        />
      </svg>
      {/* Hub + spokes: rotates while the deck is running */}
      <svg
        viewBox="0 0 64 64"
        className={`absolute inset-0 h-full w-full will-change-transform motion-safe:animate-spin [animation-duration:3.5s] ${
          reverse ? '[animation-direction:reverse]' : ''
        } ${spinning ? '' : '[animation-play-state:paused]'}`}
      >
        <circle
          cx="32"
          cy="32"
          r="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-fg/40"
        />
        {[0, 120, 240].map((deg) => (
          <line
            key={deg}
            x1="32"
            y1="32"
            x2={32 + 13 * Math.cos(((deg - 90) * Math.PI) / 180)}
            y2={32 + 13 * Math.sin(((deg - 90) * Math.PI) / 180)}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-fg/40"
          />
        ))}
        <circle
          cx="32"
          cy="32"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-fg"
        />
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
  onOpenTodoDeck,
  onToggleDone,
  onFocus,
  className = '',
}: ActiveTaskCardProps) {
  const openTasksDeck = onOpenTodoDeck || onOpenTodoManager
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()
  const isFlowMode = mode === 'flow'
  const tagColor = activeTodo?.tag ? getTagColor(activeTodo.tag) : undefined

  const liveRemaining = isRunning ? timerTick.remainingMs : (remainingMs ?? timerTick.remainingMs)

  // Tape position: elapsed / total. Flow has no fixed length — packs rest
  // centered while the counter runs up.
  const elapsedMs = activeTodo
    ? isFlowMode
      ? Math.max(0, flowTick.elapsedMs)
      : Math.max(0, totalMs - liveRemaining)
    : 0
  const ratio =
    activeTodo && !isFlowMode && totalMs > 0
      ? Math.min(1, Math.max(0, elapsedMs / totalMs))
      : 0.5
  const hasProgress = elapsedMs > 0
  const spinning = isRunning && activeTodo != null

  // Mechanical 3-digit tape counter: elapsed session minutes, 000–999.
  const counterDigits = String(Math.min(999, Math.floor(elapsedMs / 60_000)))
    .padStart(3, '0')
    .split('')

  const taskMinutes = useMemo(() => {
    if (!activeTodo || !sessions) return 0
    const targetTitle = activeTodo.title.trim().toLowerCase()
    return sessions
      .filter((s) => s.task && s.task.trim().toLowerCase() === targetTitle)
      .reduce((sum, s) => {
        const d = s.durationMs
        return sum +
          (typeof d === 'number' && Number.isFinite(d) && d > 0
            ? Math.round(d / 60_000)
            : 0)
      }, 0)
  }, [activeTodo, sessions])
  const minutesPerPomodoro =
    Number.isFinite(focusMinutes) && focusMinutes > 0 ? focusMinutes : 25
  const displayMinutes =
    taskMinutes > 0 ? taskMinutes : activeTodo ? activeTodo.pomodoros * minutesPerPomodoro : 0

  const openTodos = useMemo(() => todos.filter((x) => !x.done), [todos])
  // Focused: offer the other open todos as tape switch. Empty: quick-pick.
  // The list below scrolls, so the whole open queue is available in place.
  const pickPool = activeTodo ? openTodos.filter((x) => x.id !== activeTodo.id) : openTodos

  // Left reel unwinds (ring thins), right reel takes up (ring thickens).
  const leftPack = 1.5 + 4.5 * (1 - ratio)
  const rightPack = 1.5 + 4.5 * ratio

  // Cassette insert/eject choreography, kept in a single state object:
  // `packs` captures the live reel thickness on the transition render, so the
  // eject pop doesn't jump when the live values disappear with the todo.
  const currTodoId = activeTodo?.id ?? null
  interface CassetteState {
    id: string | null
    anim: 'insert' | 'eject' | ''
    textKey: string
    packs: { left: number; right: number }
  }
  const [cassette, setCassette] = useState<CassetteState>(() => ({
    id: currTodoId,
    anim: '',
    textKey: '',
    packs: { left: leftPack, right: rightPack },
  }))
  if (cassette.id !== currTodoId) {
    setCassette({
      id: currTodoId,
      anim: currTodoId != null ? 'insert' : 'eject',
      textKey: currTodoId ?? 'empty',
      packs: { left: leftPack, right: rightPack },
    })
  }
  const cassetteAnim = cassette.anim
  const textAnimKey = cassette.textKey

  useEffect(() => {
    if (!cassette.anim) return
    const t = setTimeout(
      () => setCassette((c) => ({ ...c, anim: '' })),
      cassette.anim === 'insert' ? 280 : 240,
    )
    return () => clearTimeout(t)
  }, [cassette])

  return (
    <BentoCard
      label="Active Task"
      indicator={
        <span
          className={`hidden h-6 shrink-0 items-center gap-1.5 rounded-pill border px-2.5 font-mono text-[10px] uppercase tracking-wider transition-colors min-[400px]:inline-flex ${
            isRunning
              ? 'border-accent/35 bg-accent/[0.07] text-accent'
              : 'border-line text-muted'
          }`}
        >
          <span
            aria-hidden="true"
            className={`dot ${isRunning ? 'bg-accent animate-pulse' : 'bg-fg/25'}`}
          />
          {isRunning ? 'Recording' : hasProgress ? 'Paused' : 'Standby'}
        </span>
      }
      action={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            playMicroClick('toggle')
            openTasksDeck?.()
          }}
          title="Open Tasks Deck (02)"
          aria-label="Open Tasks Deck"
          className="chip"
        >
          <span className="hidden min-[380px]:inline">Tasks</span>
          <span className="opacity-50 tabular-nums">02</span>
        </button>
      }
      className={className}
      contentClassName="min-h-0"
    >
      {/* Track info + cassette — the identity block */}
      <div className="flex shrink-0 items-center justify-between gap-3 pb-4">
        {/* Track info with smooth stationary cross-fade (no hopping) */}
        <div key={textAnimKey} className="flex min-w-0 flex-1 flex-col justify-center animate-track-fade">
          <h3
            className={`text-base font-medium leading-snug min-[400px]:text-lg ${
              activeTodo ? 'line-clamp-2 text-fg' : 'truncate text-muted'
            }`}
          >
            {activeTodo?.title || 'No tape inserted'}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {activeTodo?.tag ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/50 py-0.5 pl-2 pr-2.5">
                <span
                  aria-hidden="true"
                  className="dot"
                  style={{ backgroundColor: tagColor }}
                />
                <span className="text-[11px] text-fg/80">{activeTodo.tag}</span>
              </span>
            ) : null}
            <span className="text-[11px] text-muted">
              {activeTodo
                ? isRunning
                  ? 'In progress'
                  : 'Standby'
                : isRunning
                  ? 'Free session'
                  : 'Standby'}
            </span>
          </div>

          {/* Mechanical tape counter */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <div
              className="flex overflow-hidden rounded-sm border border-line bg-canvas"
              role="status"
              aria-label={`Tape counter: ${counterDigits.join('')} minutes elapsed`}
            >
              {counterDigits.map((d, i) => (
                <span
                  key={i}
                  className="num w-6 border-r border-line/60 py-1 text-center text-sm font-medium last:border-r-0"
                >
                  {d}
                </span>
              ))}
            </div>
            <span className="num whitespace-nowrap text-[11px] text-muted">
              {activeTodo ? `${displayMinutes} min focused` : 'min elapsed'}
            </span>
          </div>
        </div>

        {/* Stationary Cassette Window Frame */}
        <div className="well flex w-[116px] shrink-0 flex-col p-2 min-[360px]:w-[140px] min-[400px]:w-[168px]">
          <div className="flex flex-1 flex-col items-center justify-center">
            {/* Reel and Spindle Mount */}
            <div className="relative flex items-center justify-center">
              {/* Standby Spindles: permanently mounted in the chassis */}
              <div
                className={`flex items-center gap-2 text-fg/30 transition-opacity duration-200 ${
                  activeTodo ? 'opacity-0' : 'opacity-100'
                }`}
                aria-hidden="true"
              >
                <Reel packWidth={1.5} spinning={false} dim />
                <Reel packWidth={1.5} spinning={false} reverse dim />
              </div>

              {/* Active Tape Reels: drops onto spindles on insert / lifts off on eject */}
              {(activeTodo || cassetteAnim === 'eject') ? (
                <div
                  className={`absolute inset-0 flex items-center justify-center gap-2 text-fg ${
                    cassetteAnim === 'insert'
                      ? 'animate-reel-in'
                      : cassetteAnim === 'eject'
                        ? 'animate-reel-out'
                        : ''
                  }`}
                >
                  <Reel
                    packWidth={activeTodo ? leftPack : cassette.packs.left}
                    spinning={spinning}
                  />
                  <Reel
                    packWidth={activeTodo ? rightPack : cassette.packs.right}
                    spinning={spinning}
                    reverse
                  />
                </div>
              ) : null}
            </div>

            {/* Tape path + head: stationary mounts with animated active ribbon overlay */}
            <div className="relative mt-2.5 h-3 w-full shrink-0" aria-hidden="true">
              {/* Standby tape ribbon: permanently stationary */}
              <div className="absolute left-3 right-3 top-0 h-px bg-fg/15" />

              {/* Active tape ribbon: drops in / lifts out with the active reels */}
              {(activeTodo || cassetteAnim === 'eject') ? (
                <div
                  className={`absolute left-3 right-3 top-0 h-px bg-fg/40 ${
                    cassetteAnim === 'insert'
                      ? 'animate-reel-in'
                      : cassetteAnim === 'eject'
                        ? 'animate-reel-out'
                        : ''
                  }`}
                />
              ) : null}

              {/* Fixed magnetic head: 100% stationary chassis mount */}
              <div className="absolute left-1/2 top-[3px] flex -translate-x-1/2 items-end gap-[3px]">
                <span className="h-1.5 w-px bg-fg/25" />
                <span className="h-[5px] w-2.5 rounded-[1px] border border-fg/25 bg-track" />
                <span className="h-1.5 w-px bg-fg/25" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transport keys — permanently mounted, no layout shifts */}
      <div className="flex shrink-0 items-center gap-2.5 pt-4">
        <button
          type="button"
          onClick={() => {
            if (activeTodo) {
              playMicroClick('pop')
              onFocus?.(activeTodo.id)
            } else {
              playMicroClick('toggle')
              openTasksDeck?.()
            }
          }}
          title={activeTodo ? 'Eject tape (standby)' : 'Insert tape'}
          className="btn-secondary h-11 min-h-[44px] flex-1"
        >
          <ArrowUpFromLine size={14} />
          {activeTodo ? 'Eject' : 'Insert'}
        </button>
        <button
          type="button"
          disabled={!activeTodo || !onToggleDone}
          onClick={() => {
            if (activeTodo && onToggleDone) {
              playMicroClick('tick')
              onToggleDone(activeTodo.id)
            }
          }}
          title={activeTodo ? 'Stop and complete track' : 'No track loaded'}
          className={`btn h-11 min-h-[44px] flex-1 ${
            activeTodo ? 'btn-secondary' : 'btn-ghost opacity-40'
          }`}
        >
          <Square size={12} />
          Done
        </button>
      </div>

      {/* Queue: takes whatever height is left so the panel never voids out */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-line/60 pt-3">
        <div className="flex h-6 shrink-0 items-center justify-between">
          <span className="label">{activeTodo ? 'Up next' : 'Quick pick'}</span>
          {pickPool.length > 4 ? (
            <button
              type="button"
              onClick={openTasksDeck}
              className="num cursor-pointer text-[11px] text-muted transition-colors hover:text-fg"
            >
              +{pickPool.length - 4} more
            </button>
          ) : null}
        </div>
        {pickPool.length === 0 ? (
          <p
            onClick={openTasksDeck}
            className="flex min-h-[44px] cursor-pointer items-center text-xs text-muted transition-colors hover:text-fg"
          >
            {activeTodo
              ? 'No other tapes queued — tap for Tasks'
              : 'No open tasks — add one in Task Inbox'}
          </p>
        ) : (
          <ul className="no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col divide-y divide-line/50 overflow-y-auto px-1">
            {pickPool.map((todo) => (
              <PickRow key={todo.id} todo={todo} onFocus={onFocus} />
            ))}
          </ul>        )}
      </div>
    </BentoCard>
  )
})
