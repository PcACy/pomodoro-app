import { memo, useState, useRef, useCallback, useEffect } from 'react'
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
import { playMicroClick } from '../../lib/sound'

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

  // Settings & Theme
  settings: Settings
  onOpenSettingsModal: () => void
  onOpenAnalyticsModal: () => void

  // Zen Mode
  isZenMode: boolean
  onToggleZen: () => void
}

function formatSystemClock(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const BentoCockpit = memo(function BentoCockpit({
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
  settings,
  onOpenSettingsModal,
  onOpenAnalyticsModal,
  isZenMode,
  onToggleZen,
}: BentoCockpitProps) {
  const isRunning = mode === 'flow' ? flowStatus === 'running' : status === 'running'
  const [activeScreen, setActiveScreen] = useState<number>(0)
  const [systemTime, setSystemTime] = useState(() => formatSystemClock(new Date()))
  const scrollerRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScrollRef = useRef(false)

  // Minimalist system clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(formatSystemClock(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Smoothly scrolls to target deck (0: Focus Deck, 1: Tasks Deck, 2: Stats Deck)
  const scrollToScreen = useCallback((index: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const clampedIndex = Math.max(0, Math.min(2, index))
    isProgrammaticScrollRef.current = true
    playMicroClick('toggle')
    setActiveScreen(clampedIndex)
    scroller.scrollTo({
      left: clampedIndex * scroller.clientWidth,
      behavior: 'smooth',
    })
    setTimeout(() => {
      isProgrammaticScrollRef.current = false
    }, 450)
  }, [])

  // Sync activeScreen state on touch swipe / snap settle
  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller || isProgrammaticScrollRef.current) return
    const width = scroller.clientWidth
    if (width > 0) {
      const pageIndex = Math.round(scroller.scrollLeft / width)
      if (pageIndex !== activeScreen && pageIndex >= 0 && pageIndex <= 2) {
        setActiveScreen(pageIndex)
      }
    }
  }, [activeScreen])

  // Desktop keyboard shortcuts: Left / Right arrows to switch between 3 decks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        scrollToScreen(activeScreen - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        scrollToScreen(activeScreen + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeScreen, scrollToScreen])

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between select-none overflow-hidden">
      {/* 1. Deck Switcher Header Bar */}
      <div className="h-7 shrink-0 flex items-center justify-between px-1 mb-1 sm:mb-1.5 select-none">
        {/* Clickable Deck Switcher [ 01 FOCUS // 02 TASKS // 03 STATS ] */}
        <div className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] tracking-wider uppercase">
          <button
            type="button"
            onClick={() => scrollToScreen(0)}
            className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              activeScreen === 0
                ? 'bg-fg text-canvas font-bold shadow-sm'
                : 'text-muted hover:text-fg hover:bg-fg/5'
            }`}
            aria-pressed={activeScreen === 0}
            title="Switch to Focus Deck (01)"
          >
            <span className="text-[9px] opacity-70">01</span>
            <span>Focus</span>
          </button>
          <span className="text-muted/30 select-none">//</span>
          <button
            type="button"
            onClick={() => scrollToScreen(1)}
            className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              activeScreen === 1
                ? 'bg-fg text-canvas font-bold shadow-sm'
                : 'text-muted hover:text-fg hover:bg-fg/5'
            }`}
            aria-pressed={activeScreen === 1}
            title="Switch to Tasks Deck (02)"
          >
            <span className="text-[9px] opacity-70">02</span>
            <span>Tasks</span>
          </button>
          <span className="text-muted/30 select-none">//</span>
          <button
            type="button"
            onClick={() => scrollToScreen(2)}
            className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              activeScreen === 2
                ? 'bg-fg text-canvas font-bold shadow-sm'
                : 'text-muted hover:text-fg hover:bg-fg/5'
            }`}
            aria-pressed={activeScreen === 2}
            title="Switch to Stats Deck (03)"
          >
            <span className="text-[9px] opacity-70">03</span>
            <span>Stats</span>
          </button>
        </div>

        {/* Minimalist Desk Clock (HH:mm:ss) & Hardware Status LED */}
        <div className="flex items-center gap-2 select-none">
          <span className="font-mono text-[10px] sm:text-[11px] text-neutral-600 dark:text-neutral-400 tracking-wider tabular-nums font-medium">
            {systemTime}
          </span>
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              isRunning ? 'bg-accent animate-pulse' : 'bg-line'
            }`}
            title={isRunning ? 'Recording' : 'Standby'}
          />
        </div>
      </div>

      {/* 2. Horizontal 3-Screen Scroll-Snap Viewport (100dvh Zero-Scroll) */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="w-full flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* SCREEN 01: FOCUS DECK (Operative Ebene) */}
        <section
          aria-label="Screen 1: Focus Deck"
          className="w-full min-w-full shrink-0 snap-center snap-always h-full min-h-0 flex flex-col justify-between px-0.5"
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
          <div className="flex lg:hidden flex-col h-full min-h-0 gap-2.5 sm:gap-3">
            {/* Hero Timer */}
            <div className="flex-1 min-h-0">
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
                onModeChange={onModeChange}
                onToggle={onToggle}
                onSkip={onSkip}
                onReset={onReset}
                onAddTime={onAddTime}
                className="h-full min-h-0"
              />
            </div>

            {/* Bottom Row Companion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 shrink-0">
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
                className="min-h-[140px]"
              />

              <QuickSettingsCard
                isZenMode={isZenMode}
                onToggleZen={onToggleZen}
                onOpenSettingsModal={onOpenSettingsModal}
                className="min-h-[140px]"
              />
            </div>
          </div>
        </section>

        {/* SCREEN 02: TASKS DECK (Workspace & Log - 2-Column Split) */}
        <section
          aria-label="Screen 2: Tasks Deck"
          className="w-full min-w-full shrink-0 snap-center snap-always h-full min-h-0 flex flex-col justify-between px-0.5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-3.5 h-full min-h-0 items-stretch">
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
              className="h-full min-h-0"
            />

            {/* Right: Today's Focus Session Log */}
            <SessionLogCard
              sessions={sessions}
              onOpenAnalyticsModal={onOpenAnalyticsModal}
              className="h-full min-h-0"
            />
          </div>
        </section>

        {/* SCREEN 03: STATS DECK (Metriken & Fortschritt - 2x2 Bento Grid) */}
        <section
          aria-label="Screen 3: Stats Deck"
          className="w-full min-w-full shrink-0 snap-center snap-always h-full min-h-0 flex flex-col justify-between px-0.5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3 lg:gap-3.5 h-full min-h-0 items-stretch">
            {/* 1. Weekly Goal Load */}
            <GoalLoadCard
              sessions={sessions}
              settings={settings}
              onOpenSettings={onOpenSettingsModal}
              className="h-full min-h-0"
            />

            {/* 2. Daily Focus Time */}
            <FocusTimeCard
              sessions={sessions}
              settings={settings}
              onOpenSettings={onOpenSettingsModal}
              className="h-full min-h-0"
            />

            {/* 3. Projects Distribution Overview */}
            <ProjectsDistributionCard
              sessions={sessions}
              tags={settings.tags}
              className="h-full min-h-0"
            />

            {/* 4. Daily Streak & System Status */}
            <SystemStatusCard
              sessions={sessions}
              onOpenAnalyticsModal={onOpenAnalyticsModal}
              className="h-full min-h-0"
            />
          </div>
        </section>
      </div>

      {/* 3. Bottom Pagination Indicator (Nothing OS Pill & Dots) */}
      <div className="h-6 shrink-0 flex items-center justify-center gap-2 pt-1 select-none">
        <button
          type="button"
          onClick={() => scrollToScreen(0)}
          aria-label="Screen 1: Focus Deck"
          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
            activeScreen === 0
              ? 'w-5 bg-fg'
              : 'w-1.5 bg-fg/25 hover:bg-fg/50'
          }`}
        />
        <button
          type="button"
          onClick={() => scrollToScreen(1)}
          aria-label="Screen 2: Tasks Deck"
          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
            activeScreen === 1
              ? 'w-5 bg-fg'
              : 'w-1.5 bg-fg/25 hover:bg-fg/50'
          }`}
        />
        <button
          type="button"
          onClick={() => scrollToScreen(2)}
          aria-label="Screen 3: Stats Deck"
          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
            activeScreen === 2
              ? 'w-5 bg-fg'
              : 'w-1.5 bg-fg/25 hover:bg-fg/50'
          }`}
        />
      </div>
    </div>
  )
})


