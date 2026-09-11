import { memo, useEffect, useState } from 'react'
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
  onOpenTodoDeck?: () => void
  onToggleDone?: (id: string) => void
  onFocus?: (id: string) => void
  className?: string
}

// One pick row: touch-friendly height (min 44px) so slot state stays accessible and comfortable.
function PickRow({ todo, onFocus }: { todo: TodoItem; onFocus?: (id: string) => void }) {
  return (
    <li className="flex min-h-[44px] items-center justify-between gap-3 py-1">
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
        <span className="block font-sans text-[11px] text-muted truncate">
          {todo.tag || 'Untagged'} · {todo.pomodoros} {todo.pomodoros === 1 ? 'pomo' : 'pomos'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          playMicroClick('tick')
          onFocus?.(todo.id)
        }}
        className="shrink-0 font-sans font-medium text-xs text-muted hover:text-fg transition-colors cursor-pointer px-3 min-h-[44px] flex items-center justify-center active:scale-95"
      >
        Focus
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
  onOpenTodoDeck,
  onToggleDone,
  onFocus,
  className = '',
}: ActiveTaskCardProps) {
  const openTasksDeck = onOpenTodoDeck || onOpenTodoManager
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
        .reduce((sum, s) => {
          const d = s.durationMs
          return sum + (typeof d === 'number' && Number.isFinite(d) && d > 0 ? Math.round(d / 60_000) : 0)
        }, 0)
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

  // Cassette insert/eject choreography, kept in a single state object:
  // `packs` captures the live reel thickness on the transition render, so the
  // eject pop doesn't jump when the live values disappear with the todo.
  // The id comparison below is a render-phase adjustment (React-endorsed
  // "adjust state during render"): no effect, no prev ref, no extra commit.
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
      action={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              playMicroClick('toggle')
              openTasksDeck?.()
            }}
            title="Open Tasks Deck (02 TASKS)"
            className="h-6 px-2.5 rounded-full border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg font-sans text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <span>Tasks</span>
            <span className="text-[9px] text-muted/60">02</span>
          </button>
          <span
            className={`h-6 min-w-[76px] inline-flex items-center justify-center gap-1.5 px-2.5 font-sans text-[10px] font-medium leading-none rounded-full border transition-colors ${
              isRunning
                ? 'border-accent/60 text-accent bg-accent/10'
                : 'border-line text-muted bg-canvas'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${
                isRunning ? 'bg-accent animate-pulse [animation-duration:1s]' : 'bg-muted/40'
              }`}
            />
            <span>
              {isRunning ? 'Recording' : hasProgress ? 'Paused' : 'Standby'}
            </span>
          </span>
        </div>
      }
      className={className}
      contentClassName="justify-between h-full"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Track info with smooth stationary cross-fade (no hopping) */}
        <div key={textAnimKey} className="min-w-0 flex-1 animate-track-fade">
          <h3 className={`font-sans font-medium text-lg sm:text-xl truncate ${activeTodo ? 'text-fg' : 'text-muted'}`}>
            {activeTodo?.title || 'No tape inserted'}
          </h3>
          <div className="mt-1 h-5 flex items-center gap-2 font-sans text-xs text-neutral-600 dark:text-muted leading-none">
            {activeTodo?.tag ? (
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2 py-0.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tagColor }}
                />
                <span className="text-fg/80">{activeTodo.tag}</span>
              </span>
            ) : (
              <span>Untagged</span>
            )}
            <span>·</span>
            <span className="inline-block">
              {activeTodo ? (isRunning ? 'In progress' : 'Standby') : isRunning ? 'Free session' : 'Standby'}
            </span>
          </div>

          {/* Mechanical tape counter */}
          <div className="mt-3 flex items-center gap-2.5">
            <div
              className="flex rounded-md border border-fg/20 bg-black divide-x divide-white/10 overflow-hidden"
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
            <span className="font-sans text-[11px] text-neutral-600 dark:text-muted tabular-nums">
              {activeTodo ? `${displayMinutes} min focused` : 'Tape counter'}
            </span>
          </div>
        </div>

        {/* Stationary Cassette Window Frame - Never hops or shifts */}
        <div className="shrink-0 relative overflow-hidden rounded-xl border border-black/5 dark:border-white/5 bg-neutral-100/90 dark:bg-neutral-900/50 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.4)] p-2">
          <div className="flex flex-col items-center">
            {/* Reel and Spindle Mount */}
            <div className="relative">
              {/* Standby Spindles: permanently mounted in the chassis */}
              <div
                className={`flex items-center gap-1.5 sm:gap-2 text-fg pointer-events-none transition-opacity duration-200 ${
                  activeTodo
                    ? 'opacity-0'
                    : cassetteAnim === 'eject'
                      ? 'opacity-100 delay-100'
                      : 'opacity-100'
                }`}
                aria-hidden="true"
              >
                <Reel packWidth={1.5} spinning={false} dim />
                <Reel packWidth={1.5} spinning={false} reverse dim />
              </div>

              {/* Active Tape Reels: drops down onto spindles on insert / lifts off on eject */}
              {(activeTodo || cassetteAnim === 'eject') && (
                <div
                  className={`absolute inset-0 flex items-center gap-1.5 sm:gap-2 text-fg ${
                    cassetteAnim === 'insert'
                      ? 'animate-reel-in'
                      : cassetteAnim === 'eject'
                        ? 'animate-reel-out'
                        : ''
                  }`}
                >
                  <Reel packWidth={activeTodo ? leftPack : cassette.packs.left} spinning={spinning} />
                  <Reel packWidth={activeTodo ? rightPack : cassette.packs.right} spinning={spinning} reverse />
                </div>
              )}
            </div>

            {/* Tape path + head: stationary mounts with animated active ribbon overlay */}
            <div className="relative mt-1.5 h-3 w-full" aria-hidden="true">
              {/* Standby tape ribbon: permanently stationary */}
              <div className="absolute left-3 right-3 top-0 h-px bg-fg/15" />

              {/* Active tape ribbon: drops in / lifts out with the active reels */}
              {(activeTodo || cassetteAnim === 'eject') && (
                <div
                  className={`absolute left-3 right-3 top-0 h-px bg-fg/40 ${
                    cassetteAnim === 'insert'
                      ? 'animate-reel-in'
                      : cassetteAnim === 'eject'
                        ? 'animate-reel-out'
                        : ''
                  }`}
                />
              )}

              {/* Fixed magnetic head: 100% stationary chassis mount */}
              <div className="absolute left-1/2 top-[3px] flex -translate-x-1/2 items-end gap-[3px]">
                <span className="h-1.5 w-px bg-fg/30" />
                <span className="h-[5px] w-2.5 rounded-[1px] border border-fg/30 bg-neutral-200 dark:bg-canvas" />
                <span className="h-1.5 w-px bg-fg/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transport keys - permanently mounted 50/50 rack buttons (no layout shifts, 44px min height) */}
      <div className="mt-3.5 flex items-center gap-2">
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
          className="flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-canvas font-sans font-medium text-xs text-muted transition-all hover:border-fg/40 hover:text-fg active:scale-[0.98] cursor-pointer"
        >
          <ArrowUpFromLine size={14} />
          <span>{activeTodo ? 'Eject' : 'Insert'}</span>
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
          className={`flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border font-sans font-medium text-xs transition-all ${
            activeTodo
              ? 'border-line bg-canvas text-fg hover:bg-fg hover:text-canvas hover:border-fg active:scale-[0.98] cursor-pointer'
              : 'border-line/40 bg-canvas/40 text-muted/30 cursor-not-allowed pointer-events-none'
          }`}
        >
          <Square size={12} />
          <span>Done</span>
        </button>
      </div>

      {/* Pick slot: fixed label + 44px rows + footer — height never moves */}
      <div className="mt-3 border-t border-line/60 pt-1.5">
        <div className="flex h-6 items-center justify-between font-sans text-xs">
          <span className="text-muted font-medium">
            {activeTodo ? 'Up next' : 'Quick pick'}
          </span>
          {remainingPickCount > 0 ? (
            <button
              type="button"
              onClick={openTasksDeck}
              className="text-muted hover:text-fg transition-colors cursor-pointer text-xs"
            >
              +{remainingPickCount} more
            </button>
          ) : (
            <span aria-hidden="true" className="invisible">
              +0 more
            </span>
          )}
        </div>
        {pickPool.length === 0 ? (
          <p
            onClick={openTasksDeck}
            className="flex h-[44px] items-center font-sans text-xs text-muted hover:text-fg cursor-pointer transition-colors"
          >
            {activeTodo ? 'No other tapes queued — click for Tasks' : 'No open tasks — add one in Task Inbox'}
          </p>
        ) : (
          <ul className="divide-y divide-line/60">
            {pickTodos.map((todo) => (
              <PickRow key={todo.id} todo={todo} onFocus={onFocus} />
            ))}
            {Array.from({ length: fillerCount }).map((_, i) => (
              <li key={`filler-${i}`} aria-hidden="true" className="h-[44px]" />
            ))}
          </ul>
        )}
      </div>
    </BentoCard>
  )
})
