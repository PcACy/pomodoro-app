import { forwardRef, memo, useState, useRef, useCallback, useEffect, useImperativeHandle, useMemo } from 'react'
import type { Session, Settings, TimerMode, TimerStatus, TodoItem } from '../../types'
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
        // If already aligned to target position, exit cleanly and ensure snapping is active
        if (Math.abs(scroller.scrollLeft - targetLeft) < 2) {
          scroller.style.scrollSnapType = ''
          isProgrammaticScrollRef.current = false
          return
        }

        isProgrammaticScrollRef.current = true
        // Temporarily disable CSS scroll snapping during programmatic scroll
        // so the browser engine does not fight smooth scrolling halfway.
        scroller.style.scrollSnapType = 'none'
        scroller.scrollTo({
          left: targetLeft,
          behavior: 'smooth',
        })

        let settled = false
        const onScrollEnd = () => {
          if (settled) return
          settled = true
          scroller.style.scrollSnapType = ''
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

    // Touch swipe gesture detector for horizontal deck switching on mobile devices
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        }
      }
    }, [])

    const handleTouchEnd = useCallback(
      (e: React.TouchEvent) => {
        const start = touchStartRef.current
        touchStartRef.current = null
        if (!start || e.changedTouches.length === 0) return

        const deltaX = e.changedTouches[0].clientX - start.x
        const deltaY = e.changedTouches[0].clientY - start.y
        const elapsed = Date.now() - start.time

        // Swipe requirement: horizontal distance >= 40px, predominantly horizontal (1.2x vertical), within 700ms
        if (Math.abs(deltaX) >= 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && elapsed < 700) {
          const current = activeScreenRef.current
          if (deltaX < 0 && current < 2) {
            // Swiped left -> Next deck
            scrollToScreen(current + 1)
          } else if (deltaX > 0 && current > 0) {
            // Swiped right -> Previous deck
            scrollToScreen(current - 1)
          }
        }
      },
      [scrollToScreen],
    )

    const handleTouchCancel = useCallback(() => {
      touchStartRef.current = null
    }, [])

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
      <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between select-none overflow-hidden">
        {/* Horizontal 3-Screen Scroll-Snap Viewport (100dvh Zero-Scroll) */}
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className="w-full flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar overscroll-x-contain touch-manipulation"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            touchAction: 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* SCREEN 01: FOCUS DECK (Operative Ebene) */}
          <section
            aria-label="Screen 1: Focus Deck"
            className="w-full min-w-full shrink-0 snap-start snap-always h-full min-h-0 flex flex-col justify-between px-0.5"
          >
            {/* Landscape 2-Column: Dominant Hero Timer (~67%) + Right Companion Column (~33%) */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-2.5 sm:gap-3 lg:gap-3.5 h-full min-h-0 items-stretch">
              {/* Left: Hero Timer Card */}
              <div className="lg:col-span-8 h-full min-h-0 flex flex-col">
                <HeroTimerCard
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

              {/* Right Column: Active Task (Tape Deck) + Quick Settings */}
              <div className="lg:col-span-4 h-full min-h-0 flex flex-col gap-2.5 sm:gap-3 justify-between">
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
                  className="flex-1 min-h-0"
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
            <div className="flex lg:hidden flex-col h-full min-h-0 gap-2.5 sm:gap-3 overflow-y-auto no-scrollbar">
              {/* Hero Timer */}
              <div className="w-full shrink-0 min-h-[360px] sm:min-h-0 sm:flex-1">
                <HeroTimerCard
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
                  className="h-full min-h-[360px] sm:min-h-0"
                />
              </div>

              {/* Bottom Row Companion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 shrink-0 pb-2">
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
            className="w-full min-w-full shrink-0 snap-start snap-always h-full min-h-0 flex flex-col justify-between px-0.5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-3.5 h-full min-h-0 items-stretch overflow-y-auto md:overflow-hidden no-scrollbar">
              {/* Left: Task Inbox with Quick Add & Interactive Task List */}
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
                className="h-full min-h-[260px] md:min-h-0"
              />

              {/* Right: Today's Focus Session Log with Deep Link to Deck 03 Activity Log */}
              <SessionLogCard
                sessions={sessions}
                onOpenActivityLog={() => {
                  scrollToScreen(2, 'log')
                }}
                onJumpToFocus={() => {
                  scrollToScreen(0)
                }}
                className="h-full min-h-[260px] md:min-h-0"
              />
            </div>
          </section>

          {/* SCREEN 03: STATS DECK (Unified Insights Hub) */}
          <section
            aria-label="Screen 3: Stats Deck"
            className="w-full min-w-full shrink-0 snap-start snap-always h-full min-h-0 flex flex-col justify-between px-0.5"
          >
            {/* Deck 03 Sub-Navigation Pill Toggle */}
            <div className="h-7 shrink-0 flex items-center justify-between px-1 mb-1 sm:mb-1.5 select-none">
              <div className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] tracking-wider uppercase">
                <button
                  type="button"
                  onClick={() => {
                    playMicroClick('toggle')
                    setStatsSubView('overview')
                  }}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-[background-color,color] duration-150 ease-out cursor-pointer flex items-center gap-1.5 ${
                    statsSubView === 'overview'
                      ? 'bg-fg text-canvas shadow-sm'
                      : 'text-muted hover:text-fg hover:bg-fg/5'
                  }`}
                  aria-pressed={statsSubView === 'overview'}
                  title="Telemetry Overview"
                >
                  <span className="text-[9px] opacity-70">01</span>
                  <span>Overview</span>
                </button>
                <span className="text-muted/30 select-none">·</span>
                <button
                  type="button"
                  onClick={() => {
                    playMicroClick('toggle')
                    setStatsSubView('log')
                  }}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-[background-color,color] duration-150 ease-out cursor-pointer flex items-center gap-1.5 ${
                    statsSubView === 'log'
                      ? 'bg-fg text-canvas shadow-sm'
                      : 'text-muted hover:text-fg hover:bg-fg/5'
                  }`}
                  aria-pressed={statsSubView === 'log'}
                  title="Activity Log & Heatmap"
                >
                  <span className="text-[9px] opacity-70">02</span>
                  <span>Activity Log</span>
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px] text-muted tracking-wider uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span>{statsSubView === 'overview' ? 'Telemetry Bento' : `${sessions.length} Sessions Logged`}</span>
              </div>
            </div>

            {/* Sub-Deck View Container with Smooth Fade Transition */}
            <div className="flex-1 min-h-0 w-full relative overflow-hidden">
              {statsSubView === 'overview' ? (
                <div
                  key="stats-overview"
                  className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-2.5 sm:gap-3 lg:gap-3.5 h-full min-h-0 items-stretch overflow-y-auto md:overflow-hidden no-scrollbar animate-fade-in"
                >
                  {/* 1. Weekly Goal Load */}
                  <GoalLoadCard
                    sessions={sessions}
                    settings={settings}
                    onOpenSettings={onOpenSettingsModal}
                    className="h-full min-h-[180px] md:min-h-0"
                  />

                  {/* 2. Daily Focus Time */}
                  <FocusTimeCard
                    sessions={sessions}
                    settings={settings}
                    onOpenSettings={onOpenSettingsModal}
                    className="h-full min-h-[180px] md:min-h-0"
                  />

                  {/* 3. Projects Distribution Overview */}
                  <ProjectsDistributionCard
                    sessions={sessions}
                    tags={settings.tags}
                    className="h-full min-h-[180px] md:min-h-0"
                  />

                  {/* 4. Daily Streak & System Status */}
                  <SystemStatusCard
                    sessions={sessions}
                    onOpenActivityLog={() => {
                      setStatsSubView('log')
                    }}
                    className="h-full min-h-[180px] md:min-h-0"
                  />
                </div>
              ) : (
                <div
                  key="stats-log"
                  className="flex flex-col gap-2.5 sm:gap-3 h-full min-h-0 animate-fade-in"
                >
                  {/* View B Top: 52-Week Activity Heatmap */}
                  <BentoCard
                    label="Annual Activity Heatmap"
                    indicator={<span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    action={
                      <span className="font-mono text-[10px] text-muted tracking-wider uppercase">
                        52 WEEKS · INTENSITY
                      </span>
                    }
                    className="shrink-0 p-3.5 sm:p-4 rounded-[24px]"
                    contentClassName="min-h-0"
                  >
                    <Heatmap weeks={heat} />
                  </BentoCard>

                  {/* View B Bottom: Session Telemetry & Logs */}
                  <BentoCard
                    label="Session Telemetry & History"
                    indicator={<span className="h-1.5 w-1.5 rounded-full bg-fg" />}
                    action={
                      <span className="font-mono text-[10px] text-muted tracking-wider uppercase">
                        TELEMETRY FEED
                      </span>
                    }
                    className="flex-1 min-h-0 p-3.5 sm:p-4 rounded-[24px]"
                    contentClassName="h-full min-h-0 overflow-hidden"
                  >
                    <SessionLog
                      sessions={sessions}
                      todos={todos}
                      onClear={() => {
                        if (window.confirm(t.settings.confirmClear)) void clearSessions()
                      }}
                      onImportSettings={onImportSettings}
                      className="flex-1 min-h-0"
                    />
                  </BentoCard>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 3. Bottom Pagination Indicator (Nothing OS Pill & Dots) */}
        <div className="h-6 shrink-0 flex items-center justify-center gap-2 pt-1 select-none contain-paint">
          {[0, 1, 2].map((idx) => {
            const isActive = activeScreen === idx
            return (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToScreen(idx)}
                aria-label={`Screen ${idx + 1}`}
                className={`h-1.5 rounded-full cursor-pointer transition-[width,background-color] duration-200 ease-out will-change-[width] transform-gpu motion-reduce:transition-none ${
                  isActive ? 'w-5 bg-fg' : 'w-1.5 bg-fg/25 hover:bg-fg/50'
                }`}
              />
            )
          })}
        </div>
      </div>
    )
  }),
)
