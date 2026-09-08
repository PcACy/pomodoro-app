import { memo } from 'react'
import type { Session, Settings, TimerMode, TimerStatus, TodoItem } from '../../types'
import type { ColorMode } from '../../themes'
import { HeroTimerCard } from './HeroTimerCard'
import { GoalLoadCard } from './GoalLoadCard'
import { FocusTimeCard } from './FocusTimeCard'
import { ActiveTaskCard } from './ActiveTaskCard'
import { ProjectsDistributionCard } from './ProjectsDistributionCard'
import { QuickSettingsCard } from './QuickSettingsCard'
import { SystemStatusCard } from './SystemStatusCard'
import { TaskInboxCard } from './TaskInboxCard'

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
  onOpenTodoManager: () => void

  // Analytics & Sessions
  sessions: Session[]

  // Settings & Theme
  settings: Settings
  onUpdateSettings: (updater: (s: Settings) => Settings) => void
  colorMode: ColorMode
  onToggleColorMode: () => void
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
  onOpenTodoManager,
  sessions,
  settings,
  onUpdateSettings,
  colorMode,
  onToggleColorMode,
  onOpenSettingsModal,
  onOpenAnalyticsModal,
  isZenMode,
  onToggleZen,
}: BentoCockpitProps) {
  const isRunning = mode === 'flow' ? flowStatus === 'running' : status === 'running'

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-auto">
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
          className="md:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[320px] sm:min-h-[360px]"
        />

        {/* 2. GOAL LOAD: Circular dial gauge (Top-Right Row 1, Col 3) */}
        <GoalLoadCard
          sessions={sessions}
          settings={settings}
          onOpenSettings={onOpenSettingsModal}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 3. FOCUS TIME: Today's focus goal + 24h timeline (Top-Right Row 1, Col 4) */}
        <FocusTimeCard
          sessions={sessions}
          settings={settings}
          onOpenSettings={onOpenSettingsModal}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 4. ACTIVE TASK: Task card with metrics and quick complete (Top-Right Row 2, Cols 3-4) */}
        <ActiveTaskCard
          activeTodo={activeTodo}
          isRunning={isRunning}
          remainingMs={remainingMs}
          totalMs={totalMs}
          time={time}
          sessions={sessions}
          focusMinutes={settings.phases.focus}
          onOpenTodoManager={onOpenTodoManager}
          onToggleDone={onTodoToggle}
          className="md:col-span-2 lg:col-span-2 min-h-[170px]"
        />

        {/* 5. PROJECTS DISTRIBUTION: Multi-row segmented bars (Row 3, Cols 1-2) */}
        <ProjectsDistributionCard
          sessions={sessions}
          tags={settings.tags}
          className="md:col-span-2 lg:col-span-2 min-h-[170px]"
        />

        {/* 6. DAILY STREAK & PERFORMANCE (Row 3, Col 3) */}
        <SystemStatusCard
          sessions={sessions}
          onOpenAnalyticsModal={onOpenAnalyticsModal}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 7. QUICK SETTINGS: Compact 1x1 mechanical toggles (Row 3, Col 4) */}
        <QuickSettingsCard
          settings={settings}
          colorMode={colorMode}
          isZenMode={isZenMode}
          onUpdateSettings={onUpdateSettings}
          onToggleColorMode={onToggleColorMode}
          onToggleZen={onToggleZen}
          onOpenSettingsModal={onOpenSettingsModal}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 8. TASK INBOX: Full-width / 4-column card directly below (Row 4) */}
        <TaskInboxCard
          todos={todos}
          tags={settings.tags}
          activeTodoId={activeTodoId}
          onToggle={onTodoToggle}
          onFocus={onTodoFocus}
          onAdd={onTodoAdd}
          onOpenTodoManager={onOpenTodoManager}
          className="md:col-span-2 lg:col-span-4"
        />
      </div>
    </div>
  )
})
