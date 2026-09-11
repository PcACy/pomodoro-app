export type PhaseId = 'focus' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type TimerMode = 'pomodoro' | 'flow'

export interface PhaseConfig {
  focus: number
  shortBreak: number
  longBreak: number
  roundsBeforeLongBreak: number
}

export interface Settings {
  phases: PhaseConfig
  dailyGoalMinutes: number
  weeklyGoalMinutes: number
  tags: string[]
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
  mode?: TimerMode
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

export const DEFAULT_SETTINGS: Settings = {
  phases: {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    roundsBeforeLongBreak: 4,
  },
  weeklyGoalMinutes: 5 * 60,
  dailyGoalMinutes: 120,
  tags: ['Uni', 'Projekt', 'Coding'],
}

export const STORAGE_KEYS = {
  settings: 'pomodoro.settings',
  mode: 'pomodoro.mode',
  todos: 'pomodoro.todos',
} as const