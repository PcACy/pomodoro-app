import { memo, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Settings, Session, TodoItem } from '../../types'
import type { ColorMode, ThemeId } from '../../themes'
import type { SyncStatus } from '../../hooks/useSync'
import type { GitHubProfile } from '../../hooks/useAuth'
import { SettingsPanel } from '../Settings'
import { playMicroClick } from '../../lib/sound'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  update: (updater: (s: Settings) => Settings) => void
  themeId: ThemeId
  colorMode: ColorMode
  onColorModeChange: (m: ColorMode) => void
  sessions: Session[]
  todos: TodoItem[]
  syncStatus: SyncStatus
  syncPending: boolean
  syncLastSyncAt: number | null
  syncProfile: GitHubProfile | null
  syncAvailable: boolean
  syncLoading: boolean
  onSyncLogin: () => void
  onSyncLogout: () => void
  onSyncNow: () => void
}

export const SettingsModal = memo(function SettingsModal({
  isOpen,
  onClose,
  settings,
  update,
  themeId,
  colorMode,
  onColorModeChange,
  sessions,
  todos,
  syncStatus,
  syncPending,
  syncLastSyncAt,
  syncProfile,
  syncAvailable,
  syncLoading,
  onSyncLogin,
  onSyncLogout,
  onSyncNow,
}: SettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playMicroClick('tap')
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    // Lock background scroll while the modal is open; restore on close.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings & Preferences"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 select-none backdrop-blur-[2px]"
      onClick={() => {
        playMicroClick('tap')
        onClose()
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-card bg-surface border border-line p-5 sm:p-7 flex flex-col gap-4 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <span className="font-mono text-[10px] sm:text-xs tracking-widest text-muted uppercase">
              SETTINGS & PREFERENCES // HARDWARE
            </span>
            <h2 className="font-sans text-lg font-medium text-fg">
              Configuration & Timers
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onClose()
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <X size={13} />
            <span>ESC</span>
          </button>
        </div>

        {/* Embedded SettingsPanel */}
        <div className="flex-1">
          <SettingsPanel
            settings={settings}
            update={update}
            themeId={themeId}
            colorMode={colorMode}
            onColorModeChange={onColorModeChange}
            sessions={sessions}
            todos={todos}
            syncStatus={syncStatus}
            syncPending={syncPending}
            syncLastSyncAt={syncLastSyncAt}
            syncProfile={syncProfile}
            syncAvailable={syncAvailable}
            syncLoading={syncLoading}
            onSyncLogin={onSyncLogin}
            onSyncLogout={onSyncLogout}
            onSyncNow={onSyncNow}
          />
        </div>
      </div>
    </div>
  )
})
