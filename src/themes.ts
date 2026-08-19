export type ThemeId =
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'classic-dark'
  | 'nord'
  | 'catppuccin'

export interface ThemeDef {
  id: ThemeId
  label: string
  swatch: [string, string, string]
}

export const THEMES: ThemeDef[] = [
  { id: 'gruvbox-dark', label: 'Gruvbox Dark', swatch: ['#fe8019', '#b8bb26', '#83a598'] },
  { id: 'gruvbox-light', label: 'Gruvbox Light', swatch: ['#d65d0e', '#79740e', '#076678'] },
  { id: 'classic-dark', label: 'Classic Dark', swatch: ['#f43f5e', '#10b981', '#0ea5e9'] },
  { id: 'nord', label: 'Nord', swatch: ['#bf616a', '#a3be8c', '#81a1c1'] },
  { id: 'catppuccin', label: 'Catppuccin Mocha', swatch: ['#f38ba8', '#a6e3a1', '#89b4fa'] },
]

export const THEME_KEY = 'pomodoro.theme'
export const DEFAULT_THEME: ThemeId = 'gruvbox-dark'