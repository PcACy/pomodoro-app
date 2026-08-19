export type PhaseId = 'focus' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type TimerMode = 'pomodoro' | 'flow'
export type LayoutMode = 'split' | 'single'

export interface PhaseConfig {
  focus: number
  shortBreak: number
  longBreak: number
  roundsBeforeLongBreak: number
}

export interface Settings {
  phases: PhaseConfig
  weeklyGoalMinutes: number
  tags: string[]
  layoutMode: LayoutMode
}

export interface Session {
  id: string
  start: number
  end: number
  durationMs: number
  task: string
  tag: string
  notes?: string
  updatedAt?: number
}

export interface TimerState {
  phase: PhaseId
  status: TimerStatus
  completedFocusInCycle: number
  remainingMs: number
  totalMs: number
}

export interface TodoItem {
  id: string
  title: string
  tag: string
  done: boolean
  pomodoros: number
  createdAt: number
  completedAt?: number
  updatedAt?: number
}

export const PHASE_LABELS: Record<PhaseId, string> = {
  focus: 'Fokus',
  shortBreak: 'Kurze Pause',
  longBreak: 'Lange Pause',
}

export const DEFAULT_SETTINGS: Settings = {
  phases: {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    roundsBeforeLongBreak: 4,
  },
  weeklyGoalMinutes: 5 * 60,
  tags: ['Uni', 'Projekt', 'Coding'],
  layoutMode: 'split',
}

export const STORAGE_KEYS = {
  settings: 'pomodoro.settings',
  task: 'pomodoro.task',
  tag: 'pomodoro.tag',
  mode: 'pomodoro.mode',
  todos: 'pomodoro.todos',
} as const

declare global {
  interface DocumentPictureInPicture {
    requestWindow(options?: { width?: number; height?: number }): Promise<Window>
    window: Window | null
  }

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

export {}