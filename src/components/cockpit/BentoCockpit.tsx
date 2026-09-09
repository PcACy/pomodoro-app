import { memo } from 'react'
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

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-0">
      {/* 1. Cockpit Bento Grid (Cards 1-7): Heroic instrument panel fitting the initial viewport */}
      <section className="w-full min-h-[calc(100vh-4.5rem)] min-h-[calc(100dvh-4.5rem)] flex flex-col justify-center mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 auto-rows-auto">
          {/* 1. HERO TIMER: Large 2x2 card (Top-Left, Cols 1-2, Rows 1-2) */}
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
            className="md:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[300px] sm:min-h-[320px]"
          />

          {/* 2. GOAL LOAD: Circular dial gauge (Top-Right Row 1, Col 3) */}
          <GoalLoadCard
            sessions={sessions}
            settings={settings}
            onOpenSettings={onOpenSettingsModal}
            className="md:col-span-1 lg:col-span-1 min-h-[145px]"
          />

          {/* 3. FOCUS TIME: Today's focus goal + 24h timeline (Top-Right Row 1, Col 4) */}
          <FocusTimeCard
            sessions={sessions}
            settings={settings}
            onOpenSettings={onOpenSettingsModal}
            className="md:col-span-1 lg:col-span-1 min-h-[145px]"
          />

          {/* 4. ACTIVE TASK: Task card with metrics and quick complete (Top-Right Row 2, Cols 3-4) */}
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
            onToggleDone={onTodoToggle}
            onFocus={onTodoFocus}
            className="md:col-span-2 lg:col-span-2 min-h-[145px]"
          />

          {/* 5. PROJECTS DISTRIBUTION: Multi-row segmented bars (Row 3, Cols 1-2) */}
          <ProjectsDistributionCard
            sessions={sessions}
            tags={settings.tags}
            className="md:col-span-2 lg:col-span-2 min-h-[145px]"
          />

          {/* 6. DAILY STREAK & PERFORMANCE (Row 3, Col 3) */}
          <SystemStatusCard
            sessions={sessions}
            onOpenAnalyticsModal={onOpenAnalyticsModal}
            className="md:col-span-1 lg:col-span-1 min-h-[145px]"
          />

          {/* 7. QUICK SETTINGS: Compact 1x1 mechanical toggles (Row 3, Col 4) */}
          <QuickSettingsCard
            isZenMode={isZenMode}
            onToggleZen={onToggleZen}
            onOpenSettingsModal={onOpenSettingsModal}
            className="md:col-span-1 lg:col-span-1 min-h-[145px]"
          />
        </div>
      </section>

      {/* 2. TASK WORKSPACE & LOG (Below initial fold) */}
      <section className="w-full pt-8 pb-16 sm:pb-24">
        {/* Technical Section Divider */}
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[10px] sm:text-xs text-muted/60 tracking-widest uppercase">
            02  TASKS & LOG
          </span>
          <div className="flex-1 h-[1px] bg-line/60" />
        </div>

        {/* 2-Column Balanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-stretch">
          <TaskInboxCard
            todos={todos}
            tags={settings.tags}
            activeTodoId={activeTodoId}
            onToggle={onTodoToggle}
            onFocus={onTodoFocus}
            onAdd={onTodoAdd}
            onRemove={onTodoRemove}
            onOpenTodoManager={onOpenTodoManager}
            className="h-full"
          />

          <SessionLogCard
            sessions={sessions}
            onOpenAnalyticsModal={onOpenAnalyticsModal}
            className="h-full"
          />
        </div>
      </section>
    </div>
  )
})
