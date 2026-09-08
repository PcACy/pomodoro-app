import { memo } from 'react'
import type { PhaseId, TimerStatus } from '../types'
import type { ColorMode } from '../themes'
import type { SyncStatus } from '../hooks/useSync'
import { VimStatusLine } from './VimStatusLine'
import { useFlowTimerTick, useTimerTick } from '../hooks/useTimerTick'

interface ThemeStatusBarProps {
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

  return <VimStatusLine {...resolvedProps} />
})
