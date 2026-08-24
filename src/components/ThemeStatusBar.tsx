import { memo } from 'react'
import type { PhaseId, TimerStatus } from '../types'
import type { ColorMode, ThemeId } from '../themes'
import type { SyncStatus } from '../hooks/useSync'
import { VimStatusLine } from './VimStatusLine'
import { GlassLiveActivityBar } from './GlassLiveActivityBar'
import { MaterialGlanceableBar } from './MaterialGlanceableBar'
import { useFlowTimerTick, useTimerTick } from '../hooks/useTimerTick'

interface ThemeStatusBarProps {
  themeId: ThemeId
  colorMode: ColorMode
  mode: 'pomodoro' | 'flow'
  phase: PhaseId
  status: TimerStatus
  time?: string
  progress?: number
  task: string
  tag: string
  completedRounds: number
  totalRounds: number
  syncStatus?: SyncStatus
}

export const ThemeStatusBar = memo(function ThemeStatusBar(props: ThemeStatusBarProps) {
  const timerTick = useTimerTick()
  const flowTick = useFlowTimerTick()

  const activeTime = props.time ?? (props.mode === 'flow' ? flowTick.time : timerTick.time)
  const activeProgress = props.progress ?? (props.mode === 'flow' ? 1 : timerTick.progress)

  const resolvedProps = {
    ...props,
    time: activeTime,
    progress: activeProgress,
  }

  switch (props.themeId) {
    case 'gruvbox':
      return <VimStatusLine {...resolvedProps} />
    case 'ios-26':
      return <GlassLiveActivityBar {...resolvedProps} />
    case 'material-you':
      return <MaterialGlanceableBar {...resolvedProps} />
    default:
      return <VimStatusLine {...resolvedProps} />
  }
})
