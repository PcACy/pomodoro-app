import { memo, useCallback, useEffect, useState } from 'react'
import { BentoCard } from './BentoCard'
import { playMicroClick } from '../../lib/sound'
import { isNotifyEffective, writeNotifyFlag } from '../../lib/notify'
import { MechanicalSwitch } from '../MechanicalSwitch'
import {
  SOUND_KEY,
  AUTO_BREAKS_KEY,
  NOTIFY_KEY,
  readFlag,
  writeFlag,
  subscribeFlags,
} from '../../lib/flagsStore'

interface QuickSettingsCardProps {
  isZenMode?: boolean
  onToggleZen?: () => void
  onOpenSettingsModal: () => void
  className?: string
}

export const QuickSettingsCard = memo(function QuickSettingsCard({
  isZenMode = false,
  onToggleZen,
  onOpenSettingsModal,
  className = '',
}: QuickSettingsCardProps) {
  // Local quick toggle preferences synced to localStorage & intra-tab bus
  const [soundEnabled, setSoundEnabled] = useState(() => readFlag(SOUND_KEY, false))
  const [autoBreaks, setAutoBreaks] = useState(() => readFlag(AUTO_BREAKS_KEY, true))
  // Shared effective-state initializer: identical to the Settings panel, so
  // both toggles render the same value for the same stored flag.
  const [notifyEnabled, setNotifyEnabled] = useState(() => isNotifyEffective())

  // Stay in sync when another tab OR the Settings panel in the same tab flips these flags.
  useEffect(() => {
    return subscribeFlags((key) => {
      if (!key || key === SOUND_KEY) setSoundEnabled(readFlag(SOUND_KEY, false))
      if (!key || key === AUTO_BREAKS_KEY) setAutoBreaks(readFlag(AUTO_BREAKS_KEY, true))
      if (!key || key === NOTIFY_KEY) setNotifyEnabled(isNotifyEffective())
    })
  }, [])

  const handleToggleZen = useCallback(() => {
    playMicroClick('toggle')
    onToggleZen?.()
  }, [onToggleZen])

  const toggleSound = useCallback(() => {
    playMicroClick('toggle')
    setSoundEnabled((prev) => {
      const next = !prev
      writeFlag(SOUND_KEY, next)
      return next
    })
  }, [])

  const toggleAutoBreaks = useCallback(() => {
    playMicroClick('toggle')
    setAutoBreaks((prev) => {
      const next = !prev
      writeFlag(AUTO_BREAKS_KEY, next)
      return next
    })
  }, [])

  const toggleNotify = useCallback(() => {
    playMicroClick('toggle')
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission().then((perm) => {
          const granted = perm === 'granted'
          setNotifyEnabled(granted)
          writeNotifyFlag(granted)
        })
        return
      }
    }
    setNotifyEnabled((prev) => {
      const next = !prev
      writeNotifyFlag(next)
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
        {/* Toggle 1: Zen Mode (Direct Fullscreen Focus) */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            handleToggleZen()
          }}
          className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[11px] text-fg tracking-wider uppercase truncate group-hover:text-fg transition-colors">
              ZEN MODE
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">
              {isZenMode ? 'IMMERSIVE' : 'STANDBY'}
            </span>
          </div>
          <MechanicalSwitch
            checked={Boolean(isZenMode)}
            onChange={handleToggleZen}
            label="Zen Mode"
          />
        </div>

        {/* Toggle 2: Sound FX */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            toggleSound()
          }}
          className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[11px] text-fg tracking-wider uppercase truncate group-hover:text-fg transition-colors">
              SOUND FX
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">
              {soundEnabled ? 'ACTIVE' : 'MUTED'}
            </span>
          </div>
          <MechanicalSwitch
            checked={soundEnabled}
            onChange={toggleSound}
            label="Sound FX"
          />
        </div>

        {/* Toggle 3: Auto-Start Breaks */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            toggleAutoBreaks()
          }}
          className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[11px] text-fg tracking-wider uppercase truncate group-hover:text-fg transition-colors">
              AUTO BREAKS
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">
              {autoBreaks ? 'AUTO' : 'MANUAL'}
            </span>
          </div>
          <MechanicalSwitch
            checked={autoBreaks}
            onChange={toggleAutoBreaks}
            label="Auto Breaks"
          />
        </div>

        {/* Toggle 4: Desktop Notifications */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            toggleNotify()
          }}
          className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-[11px] text-fg tracking-wider uppercase truncate group-hover:text-fg transition-colors">
              DESKTOP ALERTS
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">
              {notifyEnabled ? 'ACTIVE' : 'MUTED'}
            </span>
          </div>
          <MechanicalSwitch
            checked={notifyEnabled}
            onChange={toggleNotify}
            label="Desktop Alerts"
          />
        </div>
      </div>
    </BentoCard>
  )
})
