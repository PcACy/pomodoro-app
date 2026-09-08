import { memo, useCallback, useState } from 'react'
import type { Settings } from '../../types'
import type { ColorMode } from '../../themes'
import { BentoCard } from './BentoCard'
import { playMicroClick } from '../../lib/sound'

interface QuickSettingsCardProps {
  settings: Settings
  colorMode: ColorMode
  onUpdateSettings: (updater: (s: Settings) => Settings) => void
  onToggleColorMode: () => void
  onOpenSettingsModal: () => void
  className?: string
}

export const QuickSettingsCard = memo(function QuickSettingsCard({
  settings,
  colorMode,
  onUpdateSettings,
  onToggleColorMode,
  onOpenSettingsModal,
  className = '',
}: QuickSettingsCardProps) {
  // Local quick toggle preferences synced to localStorage
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('pomodoro.sound') !== 'false',
  )
  const [autoBreaks, setAutoBreaks] = useState(
    () => localStorage.getItem('pomodoro.auto_breaks') === 'true',
  )

  const toggleSound = useCallback(() => {
    playMicroClick('toggle')
    setSoundEnabled((prev) => {
      const next = !prev
      localStorage.setItem('pomodoro.sound', String(next))
      return next
    })
  }, [])

  const toggleAutoBreaks = useCallback(() => {
    playMicroClick('toggle')
    setAutoBreaks((prev) => {
      const next = !prev
      localStorage.setItem('pomodoro.auto_breaks', String(next))
      return next
    })
  }, [])

  const toggleLayout = useCallback(() => {
    playMicroClick('toggle')
    onUpdateSettings((s) => ({
      ...s,
      layoutMode: s.layoutMode === 'split' ? 'single' : 'split',
    }))
  }, [onUpdateSettings])

  return (
    <BentoCard
      label="QUICK SETTINGS"
      action={
        <button
          type="button"
          onClick={() => {
            playMicroClick('tap')
            onOpenSettingsModal()
          }}
          className="font-mono text-[9px] text-muted hover:text-fg tracking-wider uppercase transition-colors cursor-pointer"
        >
          MORE ↗
        </button>
      }
      className={className}
      contentClassName="justify-between"
    >
      <div className="flex flex-col gap-3 my-auto">
        {/* Toggle 1: Dark Mode */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-sans text-xs text-fg font-medium">Dark Mode</span>
            <span className="font-mono text-[9px] text-muted uppercase">
              {colorMode === 'dark' ? 'OLED BLACK' : 'PAPER WHITE'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={colorMode === 'dark'}
            onClick={() => {
              playMicroClick('toggle')
              onToggleColorMode()
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out p-0.5 ${
              colorMode === 'dark' ? 'bg-accent border-accent' : 'bg-canvas border-line'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                colorMode === 'dark' ? 'translate-x-4' : 'translate-x-0 bg-muted'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Sound FX */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-sans text-xs text-fg font-medium">Sound Effects</span>
            <span className="font-mono text-[9px] text-muted uppercase">
              {soundEnabled ? 'ACTIVE' : 'MUTED'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={toggleSound}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out p-0.5 ${
              soundEnabled ? 'bg-accent border-accent' : 'bg-canvas border-line'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                soundEnabled ? 'translate-x-4' : 'translate-x-0 bg-muted'
              }`}
            />
          </button>
        </div>

        {/* Toggle 3: Auto-Start Breaks */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-sans text-xs text-fg font-medium">Auto Breaks</span>
            <span className="font-mono text-[9px] text-muted uppercase">
              {autoBreaks ? 'AUTOMATIC' : 'MANUAL'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoBreaks}
            onClick={toggleAutoBreaks}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out p-0.5 ${
              autoBreaks ? 'bg-accent border-accent' : 'bg-canvas border-line'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                autoBreaks ? 'translate-x-4' : 'translate-x-0 bg-muted'
              }`}
            />
          </button>
        </div>

        {/* Toggle 4: Split Layout */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-sans text-xs text-fg font-medium">Zen Layout</span>
            <span className="font-mono text-[9px] text-muted uppercase">
              {settings.layoutMode === 'split' ? 'EXPANDED' : 'COMPACT'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.layoutMode === 'split'}
            onClick={toggleLayout}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out p-0.5 ${
              settings.layoutMode === 'split' ? 'bg-accent border-accent' : 'bg-canvas border-line'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                settings.layoutMode === 'split' ? 'translate-x-4' : 'translate-x-0 bg-muted'
              }`}
            />
          </button>
        </div>
      </div>
    </BentoCard>
  )
})

