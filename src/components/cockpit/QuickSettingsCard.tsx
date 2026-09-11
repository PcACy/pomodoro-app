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
      label="Quick Settings"
      action={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            playMicroClick('tap')
            onOpenSettingsModal()
          }}
          className="font-sans text-xs text-muted/90 hover:text-fg font-medium transition-colors cursor-pointer py-1 px-1.5"
        >
          More ↗
        </button>
      }
      onClick={() => {
        playMicroClick('tap')
        onOpenSettingsModal()
      }}
      className={`cursor-pointer hover:border-white/20 transition-all rounded-[28px] ${className}`}
      contentClassName="justify-between"
    >
      <div className="flex flex-col gap-1 sm:gap-1.5 my-auto">
        {/* Toggle 1: Zen Mode */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            handleToggleZen()
          }}
          className="flex items-center justify-between gap-3 cursor-pointer group py-1 px-1.5 -mx-1.5 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-all min-h-[44px]"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-xs sm:text-[13px] font-medium text-fg truncate">
              Zen Mode
            </span>
            <span className="font-sans text-[11px] text-muted/80">
              {isZenMode ? 'Immersive focus' : 'Standby'}
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
          className="flex items-center justify-between gap-3 cursor-pointer group py-1 px-1.5 -mx-1.5 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-all min-h-[44px]"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-xs sm:text-[13px] font-medium text-fg truncate">
              Sound Effects
            </span>
            <span className="font-sans text-[11px] text-muted/80">
              {soundEnabled ? 'Active' : 'Muted'}
            </span>
          </div>
          <MechanicalSwitch
            checked={soundEnabled}
            onChange={toggleSound}
            label="Sound Effects"
          />
        </div>

        {/* Toggle 3: Auto-Start Breaks */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            toggleAutoBreaks()
          }}
          className="flex items-center justify-between gap-3 cursor-pointer group py-1 px-1.5 -mx-1.5 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-all min-h-[44px]"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-xs sm:text-[13px] font-medium text-fg truncate">
              Auto Breaks
            </span>
            <span className="font-sans text-[11px] text-muted/80">
              {autoBreaks ? 'Automatic' : 'Manual'}
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
          className="flex items-center justify-between gap-3 cursor-pointer group py-1 px-1.5 -mx-1.5 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.08] transition-all min-h-[44px]"
        >
          <div className="flex flex-col min-w-0">
            <span className="font-sans text-xs sm:text-[13px] font-medium text-fg truncate">
              Notifications
            </span>
            <span className="font-sans text-[11px] text-muted/80">
              {notifyEnabled ? 'Active' : 'Muted'}
            </span>
          </div>
          <MechanicalSwitch
            checked={notifyEnabled}
            onChange={toggleNotify}
            label="Notifications"
          />
        </div>
      </div>
    </BentoCard>
  )
})
