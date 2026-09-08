import { memo } from 'react'
import type { ThemeId, ColorMode } from '../themes'
import type { PhaseId } from '../types'

interface ThemeBackgroundProps {
  themeId?: ThemeId
  colorMode: ColorMode
  phase?: PhaseId
  isRunning?: boolean
}

export const ThemeBackground = memo(function ThemeBackground({
  colorMode,
}: ThemeBackgroundProps) {
  const isDark = colorMode === 'dark'

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* Nothing Canvas: OLED Black (#000000) or Technical Off-White (#F5F5F5) */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          backgroundColor: isDark ? '#000000' : '#f5f5f5',
        }}
      />
    </div>
  )
})
