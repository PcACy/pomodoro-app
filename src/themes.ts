export type ThemeId = 'gruvbox' | 'ios-26' | 'material-you'
export type ColorMode = 'dark' | 'light'

interface ThemeDef {
  id: ThemeId
  label: string
  swatchDark: [string, string, string]
  swatchLight: [string, string, string]
}

export const THEMES: ThemeDef[] = [
  {
    id: 'gruvbox',
    label: 'Gruvbox (TUI)',
    swatchDark: ['#fe8019', '#8ec07c', '#fabd2f'],
    swatchLight: ['#af3a03', '#689d6a', '#d79921'],
  },
  {
    id: 'ios-26',
    label: 'iOS 26 Liquid Glass',
    swatchDark: ['#ff6b00', '#1c1d21', '#0a0a0c'],
    swatchLight: ['#ff6b00', '#f4f5f7', '#e5e8eb'],
  },
  {
    id: 'material-you',
    label: 'Material You (M3)',
    swatchDark: ['#d0bcff', '#4f378b', '#211f26'],
    swatchLight: ['#6750a4', '#eaddff', '#f3edf7'],
  },
]

export const THEME_KEY = 'pomodoro.theme'
export const MODE_KEY = 'pomodoro.colorMode'
export const DEFAULT_THEME: ThemeId = 'gruvbox'
export const DEFAULT_MODE: ColorMode = 'dark'