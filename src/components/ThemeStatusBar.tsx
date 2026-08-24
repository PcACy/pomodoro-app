import { memo } from 'react'
import type { PhaseId, TimerStatus } from '../types'
import type { ColorMode, ThemeId } from '../themes'
import type { SyncStatus } from '../hooks/useSync'
import { VimStatusLine } from './VimStatusLine'
import { GlassLiveActivityBar } from './GlassLiveActivityBar'
import { MaterialGlanceableBar } from './MaterialGlanceableBar'

export interface ThemeStatusBarProps {
  themeId: ThemeId
  colorMode: ColorMode
  mode: 'pomodoro' | 'flow'
  phase: PhaseId
  status: TimerStatus
  time: string
  progress: number
  task: string
  tag: string
  completedRounds: number
  totalRounds: number
  syncStatus?: SyncStatus
}

export const ThemeStatusBar = memo(function ThemeStatusBar(props: ThemeStatusBarProps) {
  switch (props.themeId) {
    case 'gruvbox':
      return <VimStatusLine {...props} />
    case 'ios-26':
      return <GlassLiveActivityBar {...props} />
    case 'material-you':
      return <MaterialGlanceableBar {...props} />
    default:
      return <VimStatusLine {...props} />
  }
})
