export type ThemeId =
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'nothing'
  | 'ios-26'
  | 'material-you'

export interface ThemeDef {
  id: ThemeId
  label: string
  swatch: [string, string, string]
}

export const THEMES: ThemeDef[] = [
  { id: 'gruvbox-dark', label: 'Gruvbox Dark', swatch: ['#fe8019', '#b8bb26', '#83a598'] },
  { id: 'gruvbox-light', label: 'Gruvbox Light', swatch: ['#d65d0e', '#79740e', '#076678'] },
  { id: 'nothing', label: 'Nothing OS', swatch: ['#eb0028', '#ffffff', '#737373'] },
  { id: 'ios-26', label: 'iOS 26 Liquid Glass', swatch: ['#ff6b00', '#30d158', '#0a84ff'] },
  { id: 'material-you', label: 'Material You (M3)', swatch: ['#d0bcff', '#a8c7fa', '#c4eed0'] },
]

export const THEME_KEY = 'pomodoro.theme'
export const DEFAULT_THEME: ThemeId = 'gruvbox-dark'