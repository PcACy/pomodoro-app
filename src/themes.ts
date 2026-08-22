export type ThemeId = 'gruvbox' | 'nothing' | 'ios-26' | 'material-you'
export type ColorMode = 'dark' | 'light'

export interface ThemeDef {
  id: ThemeId
  label: string
  swatchDark: [string, string, string]
  swatchLight: [string, string, string]
}

export const THEMES: ThemeDef[] = [
  {
    id: 'gruvbox',
    label: 'Gruvbox',
    swatchDark: ['#fe8019', '#b8bb26', '#83a598'],
    swatchLight: ['#af3a03', '#79740e', '#076678'],
  },
  {
    id: 'nothing',
    label: 'Nothing OS',
    swatchDark: ['#eb0028', '#ffffff', '#737373'],
    swatchLight: ['#eb0028', '#000000', '#737373'],
  },
  {
    id: 'ios-26',
    label: 'iOS 26 Liquid Glass',
    swatchDark: ['#ff6b00', '#30d158', '#0a84ff'],
    swatchLight: ['#ff6b00', '#34c759', '#007aff'],
  },
  {
    id: 'material-you',
    label: 'Material You (M3)',
    swatchDark: ['#d0bcff', '#a8c7fa', '#c4eed0'],
    swatchLight: ['#6750a4', '#00639b', '#386a20'],
  },
]

export const THEME_KEY = 'pomodoro.theme'
export const MODE_KEY = 'pomodoro.colorMode'
export const DEFAULT_THEME: ThemeId = 'gruvbox'
export const DEFAULT_MODE: ColorMode = 'dark'