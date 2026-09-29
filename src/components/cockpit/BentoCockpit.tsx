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
    const isProgrammaticScrollRef = useRef(false)

    // 52-Week Heatmap data computed from sessions
    const heat = useMemo(() => heatmapData(sessions, 52), [sessions])

    const activeScreenRef = useRef(activeScreen)
    activeScreenRef.current = activeScreen
    const prevWidthRef = useRef<number>(0)
    const prevPropDeckRef = useRef<number>(activeDeck)

    // Smoothly scrolls to target deck (0: Focus Deck, 1: Tasks Deck, 2: Stats Deck)
    const scrollToScreen = useCallback(
      (index: number, subView?: 'overview' | 'log') => {
        const scroller = scrollerRef.current
        if (!scroller) return
        const clampedIndex = Math.max(0, Math.min(2, index))
        prevPropDeckRef.current = clampedIndex
        playMicroClick('toggle')
        setActiveScreen(clampedIndex)
        onDeckChange?.(clampedIndex)
        if (subView) {
          setStatsSubView(subView)
        }

        const targetLeft = clampedIndex * scroller.clientWidth
        // If already aligned to target position, exit cleanly
        if (Math.abs(scroller.scrollLeft - targetLeft) < 2) {
          isProgrammaticScrollRef.current = false
          return
        }

        isProgrammaticScrollRef.current = true
        scroller.scrollTo({
          left: targetLeft,
          behavior: 'smooth',
        })

        let settled = false
        const onScrollEnd = () => {
          if (settled) return
          settled = true
          isProgrammaticScrollRef.current = false
        }

        const timerId = window.setTimeout(onScrollEnd, 450)
        if ('onscrollend' in window) {
          scroller.addEventListener(
            'scrollend',
            () => {
              window.clearTimeout(timerId)
              onScrollEnd()
            },
            { once: true },
          )
        }
      },
      [onDeckChange],
    )

    // Trackpad swipe and mouse wheel horizontal navigation
    const handleWheel = useCallback(
      (e: React.WheelEvent<HTMLDivElement>) => {
        const scroller = scrollerRef.current
        if (!scroller || isProgrammaticScrollRef.current) return

        // If the gesture is horizontal (trackpad swipe or Shift+Wheel), let native overflow-x handle it
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5) {
          return
        }

        // If user rolls standard vertical mouse wheel over non-scrollable parts of the cockpit
        const target = e.target as HTMLElement | null
        const scrollableParent = target?.closest('.overflow-y-auto')
        if (!scrollableParent && Math.abs(e.deltaY) > 25) {
          if (e.deltaY > 0 && activeScreenRef.current < 2) {
            scrollToScreen(activeScreenRef.current + 1)
          } else if (e.deltaY < 0 && activeScreenRef.current > 0) {
            scrollToScreen(activeScreenRef.current - 1)
          }
        }
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
      if (!scroller || isProgrammaticScrollRef.current) return
      const width = scroller.clientWidth
      if (width > 0) {
        const pageIndex = Math.round(scroller.scrollLeft / width)
        if (pageIndex !== activeScreenRef.current && pageIndex >= 0 && pageIndex <= 2) {
          prevPropDeckRef.current = pageIndex
          setActiveScreen(pageIndex)
          onDeckChange?.(pageIndex)
        }
      }
    }, [onDeckChange])

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
            scroller.scrollTo({
              left: activeScreenRef.current * newWidth,
              behavior: 'auto',
            })
          }
        }
      })
      observer.observe(scroller)
      return () => observer.disconnect()
    }, [])

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
