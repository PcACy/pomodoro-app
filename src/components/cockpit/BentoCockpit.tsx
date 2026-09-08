import { memo } from 'react'
import type { Session, Settings, TimerMode, TimerStatus, TodoItem } from '../../types'
import type { ColorMode } from '../../themes'
import { HeroTimerCard } from './HeroTimerCard'
import { GoalLoadCard } from './GoalLoadCard'
import { FocusTimeCard } from './FocusTimeCard'
import { ActiveTaskCard } from './ActiveTaskCard'
import { DayFlowCard } from './DayFlowCard'
import { FocusRatioCard } from './FocusRatioCard'
import { ProjectsDistributionCard } from './ProjectsDistributionCard'
import { QuickSettingsCard } from './QuickSettingsCard'
import { SystemStatusCard } from './SystemStatusCard'
import { CycleBatteryCard } from './CycleBatteryCard'
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
  settings: Settings
  onUpdateSettings: (updater: (s: Settings) => Settings) => void
  colorMode: ColorMode
  onToggleColorMode: () => void
  onOpenSettingsModal: () => void
  isZenMode?: boolean
  onToggleZen?: () => void
}

export const BentoCockpit = memo(function BentoCockpit({
  phaseLabel,
  status,
  time = '25:00',
  progress = 0,
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
  isZenMode,
  onToggleZen,
}: BentoCockpitProps) {
  const isRunning = mode === 'flow' ? flowStatus === 'running' : status === 'running'

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-auto">
        {/* 1. HERO TIMER: Large 2x2 card (Top-Left) */}
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

        {/* 2. GOAL LOAD: Circular dial gauge (Top-Center) */}
        <GoalLoadCard
          sessions={sessions}
          settings={settings}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 3. FOCUS TIME: Memory-style segmented meter (Top-Right) */}
        <FocusTimeCard
          sessions={sessions}
          settings={settings}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 4. ACTIVE TASK: Task card with metrics and quick complete (Middle-Right) */}
        <ActiveTaskCard
          activeTodo={activeTodo}
          isRunning={isRunning}
          remainingMs={remainingMs}
          totalMs={totalMs}
          time={time}
          sessions={sessions}
          onOpenTodoManager={onOpenTodoManager}
          onToggleDone={onTodoToggle}
          className="md:col-span-2 lg:col-span-2 min-h-[170px]"
        />

        {/* 5. DAY FLOW: 24h mini timeline with red needle */}
        <DayFlowCard
          sessions={sessions}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 6. FOCUS RATIO: Sparkline & focus rate */}
        <FocusRatioCard
          sessions={sessions}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 7. QUICK SETTINGS: Mechanical toggles */}
        <QuickSettingsCard
          settings={settings}
          colorMode={colorMode}
          isZenMode={isZenMode}
          onUpdateSettings={onUpdateSettings}
          onToggleColorMode={onToggleColorMode}
          onToggleZen={onToggleZen}
          onOpenSettingsModal={onOpenSettingsModal}
          className="md:col-span-2 lg:col-span-2 min-h-[200px]"
        />

        {/* 8. PROJECTS DISTRIBUTION: Multi-row segmented bars (like Storage in screenshot) */}
        <ProjectsDistributionCard
          sessions={sessions}
          tags={settings.tags}
          className="md:col-span-2 lg:col-span-2 min-h-[170px]"
        />

        {/* 9. STATUS PILLS */}
        <SystemStatusCard
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 10. CYCLE BATTERY: Segmented battery bar with Doto % */}
        <CycleBatteryCard
          completedFocusInCycle={completedFocusInCycle}
          roundsBeforeLongBreak={roundsBeforeLongBreak}
          className="md:col-span-1 lg:col-span-1 min-h-[170px]"
        />

        {/* 11. TASK INBOX: Full-width / 4-column card at bottom */}
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
