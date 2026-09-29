import { forwardRef, memo, useState, useRef, useCallback, useEffect, useImperativeHandle, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { PhaseId, Session, Settings, TimerMode, TimerStatus, TodoItem } from '../../types'
import { HeroTimerCard } from './HeroTimerCard'
import { GoalLoadCard } from './GoalLoadCard'
import { FocusTimeCard } from './FocusTimeCard'
import { ActiveTaskCard } from './ActiveTaskCard'
import { ProjectsDistributionCard } from './ProjectsDistributionCard'
import { QuickSettingsCard } from './QuickSettingsCard'
import { SystemStatusCard } from './SystemStatusCard'
import { TaskInboxCard } from './TaskInboxCard'
import { SessionLogCard } from './SessionLogCard'
import { BentoCard } from './BentoCard'
import { Heatmap } from '../Heatmap'
import { SessionLog } from '../SessionLog'
import { heatmapData } from '../../lib/stats'
import { clearSessions } from '../../lib/db'
import { useTranslation } from '../../hooks/useTranslation'
import { playMicroClick } from '../../lib/sound'

export interface BentoCockpitRef {
  scrollToDeck: (index: number, subView?: 'overview' | 'log') => void
  setStatsSubView: (view: 'overview' | 'log') => void
}

interface BentoCockpitProps {
  // Timer props
  phase?: PhaseId
  phaseLabel: string
  status: TimerStatus
  time?: string
  progress?: number
  remainingMs: number
  totalMs: number
  mode: TimerMode
  flowStatus: TimerStatus
  flowTime?: string
  completedFocusInCycle: number
  roundsBeforeLongBreak: number
  onModeChange: (m: TimerMode) => void
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  onAddTime?: (minutes: number) => void

  // Tasks props
  todos: TodoItem[]
  activeTodoId: string | null
  activeTodo: TodoItem | null
  onTodoToggle: (id: string) => void
  onTodoFocus: (id: string) => void
  onTodoAdd: (title: string, tag: string) => void
  onTodoRemove: (id: string) => void
  onOpenTodoManager: () => void

  // Analytics & Sessions
  sessions: Session[]
  onImportSettings: (s: unknown) => void
  onImportTodos?: (todos: unknown[]) => void

  // Settings & Theme
  settings: Settings
  onOpenSettingsModal: () => void

  // Deck state sync
  activeDeck?: number
  onDeckChange?: (deck: number) => void

  // Zen Mode
  isZenMode: boolean
  onToggleZen: () => void
}

export const BentoCockpit = memo(
  forwardRef<BentoCockpitRef, BentoCockpitProps>(function BentoCockpit(
    {
      phase,
      phaseLabel,
      status,
      time,
      progress,
      remainingMs,
      totalMs,
      mode,
      flowStatus,
      flowTime,
      completedFocusInCycle,
      roundsBeforeLongBreak,
      onModeChange,
      onToggle,
      onSkip,
      onReset,
      onAddTime,
      todos,
      activeTodoId,
      activeTodo,
      onTodoToggle,
      onTodoFocus,
      onTodoAdd,
      onTodoRemove,
      onOpenTodoManager,
      sessions,
      onImportSettings,
      onImportTodos,
      settings,
      onOpenSettingsModal,
      activeDeck = 0,
      onDeckChange,
      isZenMode,
      onToggleZen,
    },
    ref,
  ) {
    const { t } = useTranslation()
    const isRunning = mode === 'flow' ? flowStatus === 'running' : status === 'running'
    const [activeScreen, setActiveScreen] = useState<number>(activeDeck)
    const [statsSubView, setStatsSubView] = useState<'overview' | 'log'>('overview')
    const scrollerRef = useRef<HTMLDivElement>(null)
    // Deck index an animated (programmatic) scroll is travelling to, or null
    // while the scroller is idle or user-driven. Tracking the target lets us
    // tell "still animating" from "settled" precisely — unlike a boolean plus a
    // fixed timeout, which expires mid-animation on longer scrolls.
    const scrollTargetRef = useRef<number | null>(null)
    const settleTimerRef = useRef<number | null>(null)
    const settleRetryRef = useRef(0)
    // Direction of a wheel step that arrived while a deck change was still in
    // flight. Draining it on arrival keeps continuous scrolling responsive
    // instead of dropping every event until the animation finishes.
    const queuedStepRef = useRef<-1 | 0 | 1>(0)
    // `finishDeckScroll` needs to chain the queued step, but `scrollToScreen`
    // already depends on it — a ref breaks that cycle.
    const scrollToScreenRef = useRef<(index: number, subView?: 'overview' | 'log') => void>(() => {})

    // 52-Week Heatmap data computed from sessions
    const heat = useMemo(() => heatmapData(sessions, 52), [sessions])

    const activeScreenRef = useRef(activeScreen)
    activeScreenRef.current = activeScreen
    const prevWidthRef = useRef<number>(0)
    const prevPropDeckRef = useRef<number>(activeDeck)

    /** Drops the pending safety timer and its retry budget. */
    const clearSettleTimer = useCallback(() => {
      settleRetryRef.current = 0
      if (settleTimerRef.current != null) {
        window.clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
    }, [])

    /**
     * Abandons an in-flight deck change without reporting anything: the scroller
     * is about to be driven by the user (or the layout is changing), so neither
     * the queued step nor a late settle should still apply.
     */
    const cancelPendingScroll = useCallback(() => {
      scrollTargetRef.current = null
      queuedStepRef.current = 0
      clearSettleTimer()
    }, [clearSettleTimer])

    /**
     * Completes an animated deck change: clears the in-flight marker, snaps the
     * scroller exactly onto the deck boundary (so an interrupted animation can
     * never leave a half-deck sliver on screen) and re-syncs the reported deck
     * with what is actually visible. A queued wheel step continues the walk.
     *
     * `expected` names the deck the caller believes it is settling. A late event
     * belonging to a scroll we already replaced (a stale `scrollend`) is ignored
     * rather than applied to its successor — otherwise settling the old target
     * would yank the fresh animation to the wrong deck.
     */
    const finishDeckScroll = useCallback(
      (expected?: number) => {
        const pending = scrollTargetRef.current
        if (expected != null && pending != null && expected !== pending) return
        clearSettleTimer()
        const target = pending ?? expected
        const scroller = scrollerRef.current
        if (target == null || !scroller) return
        scrollTargetRef.current = null

        // A zero-width scroller (deck not laid out yet, or hidden) has no valid
        // offset for this target — snapping would drag it to the left edge.
        const width = scroller.clientWidth
        if (width > 0) {
          const targetLeft = target * width
          if (Math.abs(scroller.scrollLeft - targetLeft) > 0.5) {
            scroller.scrollTo({ left: targetLeft, behavior: 'auto' })
          }
        }
        if (target !== activeScreenRef.current) {
          prevPropDeckRef.current = target
          activeScreenRef.current = target
          setActiveScreen(target)
          onDeckChange?.(target)
        }

        // Apply the step that was requested mid-flight, from a clean boundary.
        const step = queuedStepRef.current
        if (step !== 0) {
          queuedStepRef.current = 0
          scrollToScreenRef.current(target + step)
        }
      },
      [clearSettleTimer, onDeckChange],
    )

    /**
     * Safety net for a deck change that never settles on its own (an engine
     * without `scrollend`, a throttled animation, a dropped frame): commit the
     * target instead of stranding the scroller between two decks. Arrival is
     * normally detected the frame it happens, so this only ever runs for a
     * genuinely stuck scroll — it re-checks a few times first so a merely slow
     * animation is not yanked to its end.
     */
    const armSettleSafety = useCallback(
      () => {
        clearSettleTimer()
        const tick = () => {
          settleTimerRef.current = null
          const scroller = scrollerRef.current
          // Follow the *live* target rather than `expected`: if a newer deck
          // change replaced it, that one owns the scroller and still needs a
          // settle. Bailing out here would leave it pending forever.
          const pending = scrollTargetRef.current
          if (pending == null || !scroller) return
          const width = scroller.clientWidth
          const arrived = width > 0 && Math.abs(scroller.scrollLeft - pending * width) <= 2
          if (!arrived && settleRetryRef.current < 6) {
            settleRetryRef.current += 1
            settleTimerRef.current = window.setTimeout(tick, 250)
            return
          }
          finishDeckScroll(pending)
        }
        settleTimerRef.current = window.setTimeout(tick, 700)
      },
      [clearSettleTimer, finishDeckScroll],
    )


    // Smoothly scrolls to target deck (0: Focus Deck, 1: Tasks Deck, 2: Stats Deck)
    const scrollToScreen = useCallback(
      (index: number, subView?: 'overview' | 'log') => {
        const scroller = scrollerRef.current
        if (!scroller) return
        const clampedIndex = Math.max(0, Math.min(2, index))
        prevPropDeckRef.current = clampedIndex
        activeScreenRef.current = clampedIndex
        playMicroClick('toggle')
        setActiveScreen(clampedIndex)
        onDeckChange?.(clampedIndex)
        if (subView) {
          setStatsSubView(subView)
        }

        const targetLeft = clampedIndex * scroller.clientWidth
        // Already aligned: retire any in-flight target (its late settle must not
        // drag us back to the deck it was heading for) and just tidy the sliver.
        if (Math.abs(scroller.scrollLeft - targetLeft) < 2) {
          scrollTargetRef.current = null
          finishDeckScroll(clampedIndex)
          return
        }

        scrollTargetRef.current = clampedIndex
        scroller.scrollTo({
          left: targetLeft,
          behavior: 'smooth',
        })
        armSettleSafety()
      },
      [armSettleSafety, finishDeckScroll, onDeckChange],
    )
    scrollToScreenRef.current = scrollToScreen

    // Trackpad swipe and mouse wheel horizontal navigation
    const handleWheel = useCallback(
      (e: React.WheelEvent<HTMLDivElement>) => {
        const scroller = scrollerRef.current
        if (!scroller) return

        // If the gesture is horizontal (trackpad swipe or Shift+Wheel), let native overflow-x handle it
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5) {
          return
        }

        // Ignore vertical wheel that belongs to a scrollable card in the deck
        if ((e.target as HTMLElement | null)?.closest('.overflow-y-auto')) return
        if (Math.abs(e.deltaY) <= 25) return

        const step: 1 | -1 = e.deltaY > 0 ? 1 : -1
        // `activeScreenRef` already holds the in-flight target, so this is the
        // deck the gesture is heading towards either way.
        const next = activeScreenRef.current + step
        if (next < 0 || next > 2) return

        if (scrollTargetRef.current != null) {
          // Remember the intent instead of dropping it: `finishDeckScroll`
          // drains it from a settled boundary, so a continuous wheel burst
          // walks deck by deck without ever interrupting an animation.
          queuedStepRef.current = step
          return
        }

        scrollToScreen(next)
      },
      [scrollToScreen],
    )

    // Expose imperative API for external control (e.g. from topbar or deep links)
    useImperativeHandle(
      ref,
      () => ({
        scrollToDeck: (index: number, subView?: 'overview' | 'log') => {
          scrollToScreen(index, subView)
        },
        setStatsSubView: (view: 'overview' | 'log') => {
          setStatsSubView(view)
        },
      }),
      [scrollToScreen],
    )

    // Sync from activeDeck prop ONLY when changed from an external parent update
    useEffect(() => {
      if (activeDeck !== undefined && activeDeck !== prevPropDeckRef.current) {
        prevPropDeckRef.current = activeDeck
        if (activeDeck !== activeScreenRef.current) {
          scrollToScreen(activeDeck)
        }
      }
    }, [activeDeck, scrollToScreen])

    // Sync activeScreen state on touch swipe / trackpad / snap settle
    const handleScroll = useCallback(() => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const width = scroller.clientWidth
      if (width <= 0) return

      // While a deck change animates, ignore intermediate positions: they sit
      // between two decks, so rounding reports the neighbouring one and the
      // indicator would jump ahead of (or behind) the content. Reconcile only
      // once the animation has arrived.
      const target = scrollTargetRef.current
      if (target != null) {
        if (Math.abs(scroller.scrollLeft - target * width) <= 2) finishDeckScroll(target)
        return
      }

      const pageIndex = Math.round(scroller.scrollLeft / width)
      if (pageIndex !== activeScreenRef.current && pageIndex >= 0 && pageIndex <= 2) {
        prevPropDeckRef.current = pageIndex
        activeScreenRef.current = pageIndex
        setActiveScreen(pageIndex)
        onDeckChange?.(pageIndex)
      }
    }, [finishDeckScroll, onDeckChange])

    // Keep scroll position aligned to activeScreen only when container actually resizes
    useEffect(() => {
      const scroller = scrollerRef.current
      if (!scroller || typeof ResizeObserver === 'undefined') return
      prevWidthRef.current = scroller.clientWidth

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width
          if (newWidth > 0 && Math.abs(newWidth - prevWidthRef.current) > 2) {
            prevWidthRef.current = newWidth
            // A resize invalidates any in-flight target: abort it and re-align
            // to the deck we are on so the geometry stays consistent.
            cancelPendingScroll()
            scroller.scrollTo({
              left: activeScreenRef.current * newWidth,
              behavior: 'auto',
            })
          }
        }
      })
      observer.observe(scroller)
      return () => observer.disconnect()
    }, [cancelPendingScroll])

    // Settle animated deck changes deterministically: `scrollend` fires when the
    // scroller actually stops, which is the only reliable moment to snap onto a
    // deck boundary. A pointer press hands control back to the user.
    useEffect(() => {
      const scroller = scrollerRef.current
      if (!scroller) return
      const onScrollEnd = () => {
        const pending = scrollTargetRef.current
        const el = scrollerRef.current
        const width = el?.clientWidth ?? 0
        // A `scrollend` belonging to an animation we already replaced arrives
        // while the new target is still a deck (or more) away: settling there
        // would snap the fresh animation to the wrong position. Only settle a
        // stop that actually landed on the pending deck.
        if (pending == null || !el || width <= 0) return
        if (Math.abs(el.scrollLeft - pending * width) > 2) return
        finishDeckScroll(pending)
      }
      scroller.addEventListener('scrollend', onScrollEnd)
      scroller.addEventListener('pointerdown', cancelPendingScroll)
      scroller.addEventListener('touchstart', cancelPendingScroll, { passive: true })
      return () => {
        scroller.removeEventListener('scrollend', onScrollEnd)
        scroller.removeEventListener('pointerdown', cancelPendingScroll)
        scroller.removeEventListener('touchstart', cancelPendingScroll)
        clearSettleTimer()
      }
    }, [cancelPendingScroll, clearSettleTimer, finishDeckScroll])

    // Keyboard shortcuts:
    // '1' -> Focus Deck (0)
    // '2' -> Tasks Deck (1)
    // '3' -> Stats Deck (2)
    // Left / Right arrows -> Deck switching
    // Inside Deck 03: Up / Down arrows -> Switch Overview / Activity Log
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const activeEl = document.activeElement
        // Ignore shortcuts when user is typing or if any modal/dialog is currently active
        if (
          document.querySelector('[role="dialog"]') !== null ||
          (activeEl &&
            (activeEl.tagName === 'INPUT' ||
              activeEl.tagName === 'TEXTAREA' ||
              activeEl.tagName === 'SELECT' ||
              activeEl.getAttribute('contenteditable') === 'true' ||
              (activeEl as HTMLElement).isContentEditable ||
              activeEl.closest('[role="dialog"]')))
        ) {
          return
        }
        if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return

        if (e.key === '1') {
          e.preventDefault()
          scrollToScreen(0)
        } else if (e.key === '2') {
          e.preventDefault()
          scrollToScreen(1)
        } else if (e.key === '3') {
          e.preventDefault()
          scrollToScreen(2)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          scrollToScreen(activeScreen - 1)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          scrollToScreen(activeScreen + 1)
        } else if (activeScreen === 2) {
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            playMicroClick('toggle')
            setStatsSubView('overview')
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            playMicroClick('toggle')
            setStatsSubView('log')
          }
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeScreen, scrollToScreen])

    return (
      <div className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden">
        {/* Horizontal 3-Screen Scroll-Snap Viewport (100dvh Zero-Scroll) */}
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          className="no-scrollbar flex w-full min-h-0 flex-1 snap-x snap-mandatory touch-pan-x overflow-x-auto overscroll-x-contain"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* SCREEN 01: FOCUS DECK (Operative Ebene) */}
          <section
            aria-label="Screen 1: Focus Deck"
            className="h-full min-h-0 w-full min-w-full shrink-0 snap-start snap-always"
          >
            {/* Landscape 2-Column: Hero Timer (~67%) + Right Companion Column (~33%) */}
            <div className="hidden h-full min-h-0 grid-cols-12 gap-3 lg:grid xl:gap-3.5">
              <div className="flex h-full min-h-0 flex-col lg:col-span-8">
                <HeroTimerCard
                  phase={phase}
                  phaseLabel={phaseLabel}
                  status={status}
                  time={time}
                  progress={progress}
                  mode={mode}
                  flowStatus={flowStatus}
                  flowTime={flowTime}
                  completedFocusInCycle={completedFocusInCycle}
                  roundsBeforeLongBreak={roundsBeforeLongBreak}
                  activeTodo={activeTodo}
                  onModeChange={onModeChange}
                  onToggle={onToggle}
                  onSkip={onSkip}
                  onReset={onReset}
                  onAddTime={onAddTime}
                  className="h-full min-h-0 flex-1"
                />
              </div>

              <div className="flex h-full min-h-0 flex-col gap-3 [justify-content:safe_center] lg:col-span-4">
                <ActiveTaskCard
                  activeTodo={activeTodo}
                  todos={todos}
                  isRunning={isRunning}
                  remainingMs={remainingMs}
                  totalMs={totalMs}
                  mode={mode}
                  sessions={sessions}
                  focusMinutes={settings.phases.focus}
                  onOpenTodoManager={onOpenTodoManager}
                  onOpenTodoDeck={() => scrollToScreen(1)}
                  onToggleDone={onTodoToggle}
                  onFocus={onTodoFocus}
                  className="max-h-full shrink-0"
                />

                <QuickSettingsCard
                  isZenMode={isZenMode}
                  onToggleZen={onToggleZen}
                  onOpenSettingsModal={onOpenSettingsModal}
                  className="shrink-0"
                />
              </div>
            </div>

            {/* Portrait Layout (Tablets & Mobile Portrait) */}
            <div className="no-scrollbar flex h-full min-h-0 flex-col gap-3 overflow-y-auto lg:hidden">
              <div className="w-full shrink-0 sm:min-h-0 sm:flex-1">
                <HeroTimerCard
                  phase={phase}
                  phaseLabel={phaseLabel}
                  status={status}
                  time={time}
                  progress={progress}
                  mode={mode}
                  flowStatus={flowStatus}
                  flowTime={flowTime}
                  completedFocusInCycle={completedFocusInCycle}
                  roundsBeforeLongBreak={roundsBeforeLongBreak}
                  activeTodo={activeTodo}
                  onModeChange={onModeChange}
                  onToggle={onToggle}
                  onSkip={onSkip}
                  onReset={onReset}
                  onAddTime={onAddTime}
                  className="h-full min-h-[330px] sm:min-h-[300px] lg:min-h-0"
                />
              </div>

              <div className="grid shrink-0 grid-cols-1 gap-3 pb-3 lg:grid-cols-2">
                <ActiveTaskCard
                  activeTodo={activeTodo}
                  todos={todos}
                  isRunning={isRunning}
                  remainingMs={remainingMs}
                  totalMs={totalMs}
                  mode={mode}
                  sessions={sessions}
                  focusMinutes={settings.phases.focus}
                  onOpenTodoManager={onOpenTodoManager}
                  onOpenTodoDeck={() => scrollToScreen(1)}
                  onToggleDone={onTodoToggle}
                  onFocus={onTodoFocus}
                />

                <QuickSettingsCard
                  isZenMode={isZenMode}
                  onToggleZen={onToggleZen}
                  onOpenSettingsModal={onOpenSettingsModal}
                />
              </div>
            </div>
          </section>

          {/* SCREEN 02: TASKS DECK (Workspace & Log - 2-Column Split) */}
          <section
            aria-label="Screen 2: Tasks Deck"
            className="flex h-full min-h-0 w-full min-w-full shrink-0 snap-start snap-always flex-col justify-center"
          >
            {/* Two columns only when there is room for them; below `lg` the
                cards stay content-sized and stacked, which avoids stretched
                panels with empty chart space on tablets. */}
            {/* Deck 02 is a single row on `lg`, so it gets a tighter ceiling
                than the two-row telemetry grid below. */}
            <div
              className="deck-grid no-scrollbar grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto pb-3 lg:grid-cols-2 lg:pb-0 xl:gap-3.5"
              style={{ '--deck-max': '38rem' } as CSSProperties}
            >
              <TaskInboxCard
                todos={todos}
                tags={settings.tags}
                activeTodoId={activeTodoId}
                onToggle={onTodoToggle}
                onFocus={(id) => {
                  onTodoFocus(id)
                  // Auto-return: Load cassette and smoothly slide back to Focus Deck!
                  scrollToScreen(0)
                }}
                onAdd={onTodoAdd}
                onRemove={onTodoRemove}
                onOpenTodoManager={onOpenTodoManager}
                className="h-full min-h-[300px] lg:max-h-full lg:min-h-0"
              />

              <SessionLogCard
                sessions={sessions}
                onOpenActivityLog={() => {
                  scrollToScreen(2, 'log')
                }}
                onJumpToFocus={() => {
                  scrollToScreen(0)
                }}
                className="h-full min-h-[300px] lg:max-h-full lg:min-h-0"
              />
            </div>
          </section>

          {/* SCREEN 03: STATS DECK (Unified Insights Hub) */}
          <section
            aria-label="Screen 3: Stats Deck"
            className="flex h-full min-h-0 w-full min-w-full shrink-0 snap-start snap-always flex-col"
          >
            {/* Deck 03 Sub-Navigation */}
            <div className="mb-3 flex h-8 shrink-0 items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playMicroClick('toggle')
                    setStatsSubView('overview')
                  }}
                  className="chip"
                  aria-pressed={statsSubView === 'overview'}
                  title="Telemetry Overview"
                >
                  <span className="opacity-50">01</span>
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playMicroClick('toggle')
                    setStatsSubView('log')
                  }}
                  className="chip"
                  aria-pressed={statsSubView === 'log'}
                  title="Activity Log & Heatmap"
                >
                  <span className="opacity-50">02</span>
                  Activity Log
                </button>
              </div>

              <span className="label hidden shrink-0 items-center gap-2 sm:flex">
                <span
                  aria-hidden="true"
                  className="dot bg-accent"
                />
                {statsSubView === 'overview'
                  ? 'Telemetry Bento'
                  : `${sessions.length} Sessions Logged`}
              </span>
            </div>

            {/* Sub-Deck View Container. Centred so that a grid capped by
                `--deck-max` reads as a deliberate, optically balanced block
                rather than a top-pinned cluster with a dead band beneath it.
                Both variants below are `h-full` + internally scrollable, so
                the container itself never overflows and centring is safe. */}
            <div className="relative flex min-h-0 w-full flex-1 flex-col justify-center">
              {statsSubView === 'overview' ? (
                <div
                  key="stats-overview"
                  className="deck-grid no-scrollbar grid h-full min-h-0 animate-fade-in grid-cols-1 gap-3 overflow-y-auto pb-3 lg:grid-cols-2 lg:pb-0 xl:gap-3.5"
                >
                  <GoalLoadCard
                    sessions={sessions}
                    settings={settings}
                    onOpenSettings={onOpenSettingsModal}
                    className="h-full min-h-[250px] lg:min-h-0"
                  />

                  <FocusTimeCard
                    sessions={sessions}
                    settings={settings}
                    onOpenSettings={onOpenSettingsModal}
                    className="h-full min-h-[250px] lg:min-h-0"
                  />

                  <ProjectsDistributionCard
                    sessions={sessions}
                    tags={settings.tags}
                    className="h-full min-h-[270px] lg:min-h-0"
                  />

                  <SystemStatusCard
                    sessions={sessions}
                    onOpenActivityLog={() => {
                      setStatsSubView('log')
                    }}
                    className="h-full min-h-[240px] lg:min-h-0"
                  />
                </div>
              ) : (
                <div
                  key="stats-log"
                  className="no-scrollbar flex h-full min-h-0 animate-fade-in flex-col gap-3 overflow-y-auto pb-3 lg:pb-0"
                >
                  {/* View B Top: 52-Week Activity Heatmap */}
                  <BentoCard
                    label="Activity Heatmap"
                    indicator={
                      <span
                        aria-hidden="true"
                        className="dot bg-accent"
                      />
                    }
                    action={
                      <span className="label-sm">52 weeks</span>
                    }
                    className="shrink-0"
                    contentClassName="min-h-0"
                  >
                    <Heatmap weeks={heat} />
                  </BentoCard>

                  {/* View B Bottom: Session Telemetry & Logs */}
                  <BentoCard
                    label="Session Telemetry"
                    indicator={
                      <span
                        aria-hidden="true"
                        className="dot bg-fg/25"
                      />
                    }
                    action={<span className="label-sm">Feed</span>}
                    className="min-h-[320px] flex-1 md:min-h-0"
                    contentClassName="h-full min-h-0 overflow-hidden"
                  >
                    <SessionLog
                      sessions={sessions}
                      todos={todos}
                      onClear={() => {
                        if (window.confirm(t.settings.confirmClear)) void clearSessions()
                      }}
                      onImportSettings={onImportSettings}
                      onImportTodos={onImportTodos}
                      className="min-h-0 flex-1"
                    />
                  </BentoCard>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    )
  }),
)
