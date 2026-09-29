import { memo, useCallback, useEffect, useState, type ReactNode } from 'react'
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

/** One settings row: label + state, with a 44px minimum touch target. */
function SettingRow({
  title,
  state,
  checked,
  onToggle,
  label,
}: {
  title: string
  state: string
  checked: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <div
      onClick={onToggle}
      className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 rounded-control px-2.5 py-1.5 transition-colors hover:bg-fg/[0.04] active:bg-fg/[0.07]"
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium text-fg">{title}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {state}
        </span>
      </div>
      <MechanicalSwitch checked={checked} onChange={onToggle} label={label} />
    </div>
  )
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

  const rows: { key: string; title: string; state: string; checked: boolean; onToggle: () => void }[] = [
    {
      key: 'zen',
      title: 'Zen Mode',
      state: isZenMode ? 'Immersive focus' : 'Standby',
      checked: Boolean(isZenMode),
      onToggle: handleToggleZen,
    },
    {
      key: 'sound',
      title: 'Sound Effects',
      state: soundEnabled ? 'Active' : 'Muted',
      checked: soundEnabled,
      onToggle: toggleSound,
    },
    {
      key: 'breaks',
      title: 'Auto Breaks',
      state: autoBreaks ? 'Automatic' : 'Manual',
      checked: autoBreaks,
      onToggle: toggleAutoBreaks,
    },
    {
      key: 'notify',
      title: 'Notifications',
      state: notifyEnabled ? 'Active' : 'Muted',
      checked: notifyEnabled,
      onToggle: toggleNotify,
    },
  ]

  const action: ReactNode = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        playMicroClick('tap')
        onOpenSettingsModal()
      }}
      className="chip"
    >
      More
    </button>
  )

  return (
    <BentoCard
      label="Quick Settings"
      action={action}
      className={className}
      contentClassName="min-h-0"
    >
      <div className="no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">
        {rows.map((row) => (
          <SettingRow
            key={row.key}
            title={row.title}
            state={row.state}
            checked={row.checked}
            onToggle={row.onToggle}
            label={row.title}
          />
        ))}
      </div>
    </BentoCard>
  )
})
