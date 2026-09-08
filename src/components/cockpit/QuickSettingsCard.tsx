import { memo, useCallback, useEffect, useState } from 'react'
import type { Settings } from '../../types'
import type { ColorMode } from '../../themes'
import { BentoCard } from './BentoCard'
import { playMicroClick } from '../../lib/sound'

const SOUND_KEY = 'pomodoro.sound'
const AUTO_BREAKS_KEY = 'pomodoro.auto_breaks'

function readFlag(key: string, expectTrue: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    return expectTrue ? raw === 'true' : raw !== 'false'
  } catch {
    // Storage unavailable (private mode / blocked cookies): fall back to defaults.
    return !expectTrue
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* storage unavailable */
  }
}

interface QuickSettingsCardProps {
  settings?: Settings
  colorMode: ColorMode
  isZenMode?: boolean
  onUpdateSettings?: (updater: (s: Settings) => Settings) => void
  onToggleColorMode: () => void
  onToggleZen?: () => void
  onOpenSettingsModal: () => void
  className?: string
}

export const QuickSettingsCard = memo(function QuickSettingsCard({
  settings: _settings,
  colorMode,
  isZenMode = false,
  onUpdateSettings: _onUpdateSettings,
  onToggleColorMode,
  onToggleZen,
  onOpenSettingsModal,
  className = '',
}: QuickSettingsCardProps) {
  // Local quick toggle preferences synced to localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => readFlag(SOUND_KEY, false))
  const [autoBreaks, setAutoBreaks] = useState(() => readFlag(AUTO_BREAKS_KEY, true))

  // Stay in sync when another tab (or the Settings panel) flips these flags.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SOUND_KEY) setSoundEnabled(readFlag(SOUND_KEY, false))
      else if (e.key === AUTO_BREAKS_KEY) setAutoBreaks(readFlag(AUTO_BREAKS_KEY, true))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleSound = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    playMicroClick('toggle')
    setSoundEnabled((prev) => {
      const next = !prev
      writeFlag(SOUND_KEY, next)
      return next
    })
  }, [])

  const toggleAutoBreaks = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    playMicroClick('toggle')
    setAutoBreaks((prev) => {
      const next = !prev
      writeFlag(AUTO_BREAKS_KEY, next)
      return next
    })
  }, [])

  return (
    <BentoCard
      label="QUICK SETTINGS"
      action={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            playMicroClick('tap')
            onOpenSettingsModal()
          }}
          className="font-mono text-[9px] text-muted hover:text-fg tracking-wider uppercase transition-colors cursor-pointer"
        >
          MORE ↗
        </button>
      }
      onClick={() => {
        playMicroClick('tap')
        onOpenSettingsModal()
      }}
      className={`cursor-pointer hover:border-fg/30 transition-colors ${className}`}
      contentClassName="justify-between"
    >
      <div className="flex flex-col gap-1.5 sm:gap-2 my-auto">
        {/* Toggle 1: Dark Mode */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            playMicroClick('toggle')
            onToggleColorMode()
          }}
          className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-[11px] text-fg font-medium truncate group-hover:text-fg transition-colors">
              Dark Mode
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">
              {colorMode === 'dark' ? 'OLED' : 'LIGHT'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={colorMode === 'dark'}
            onClick={(e) => {
              e.stopPropagation()
              playMicroClick('toggle')
              onToggleColorMode()
            }}
            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out p-0.5 ${
              colorMode === 'dark' ? 'bg-accent border-accent' : 'bg-canvas border-line'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                colorMode === 'dark' ? 'translate-x-3.5' : 'translate-x-0 bg-muted'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Sound FX */}
        <div
          onClick={toggleSound}
          className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-[11px] text-fg font-medium truncate group-hover:text-fg transition-colors">
              Sound FX
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">
              {soundEnabled ? 'ACTIVE' : 'MUTED'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={toggleSound}
            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out p-0.5 ${
              soundEnabled ? 'bg-accent border-accent' : 'bg-canvas border-line'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                soundEnabled ? 'translate-x-3.5' : 'translate-x-0 bg-muted'
              }`}
            />
          </button>
        </div>

        {/* Toggle 3: Auto-Start Breaks */}
        <div
          onClick={toggleAutoBreaks}
          className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-[11px] text-fg font-medium truncate group-hover:text-fg transition-colors">
              Auto Breaks
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">
              {autoBreaks ? 'AUTO' : 'MANUAL'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoBreaks}
            onClick={toggleAutoBreaks}
            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out p-0.5 ${
              autoBreaks ? 'bg-accent border-accent' : 'bg-canvas border-line'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                autoBreaks ? 'translate-x-3.5' : 'translate-x-0 bg-muted'
              }`}
            />
          </button>
        </div>

        {/* Toggle 4: Distraction Free (Immersive Zen Mode) */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            playMicroClick('toggle')
            onToggleZen?.()
          }}
          className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-[11px] text-fg font-medium truncate group-hover:text-fg transition-colors">
              Distraction Free
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">
              {isZenMode ? 'IMMERSIVE' : 'STANDBY'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(isZenMode)}
            onClick={(e) => {
              e.stopPropagation()
              playMicroClick('toggle')
              onToggleZen?.()
            }}
            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out p-0.5 ${
              isZenMode ? 'bg-accent border-accent' : 'bg-canvas border-line'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                isZenMode ? 'translate-x-3.5' : 'translate-x-0 bg-muted'
              }`}
            />
          </button>
        </div>
      </div>
    </BentoCard>
  )
})
