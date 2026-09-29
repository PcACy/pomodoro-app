import { memo, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Settings, Session, TodoItem } from '../../types'
import type { ThemeId } from '../../themes'
import type { SyncStatus } from '../../hooks/useSync'
import type { GitHubProfile } from '../../hooks/useAuth'
import { SettingsPanel } from '../Settings'
import { playMicroClick } from '../../lib/sound'
import { lockBodyScroll } from '../../lib/modalScrollLock'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  update: (updater: (s: Settings) => Settings) => void
  themeId?: ThemeId
  onThemeChange?: (theme: ThemeId) => void
  sessions: Session[]
  todos: TodoItem[]
  syncStatus: SyncStatus
  syncPending: boolean
  syncLastSyncAt: number | null
  syncProfile: GitHubProfile | null
  syncAvailable: boolean
  syncLoading: boolean
  syncError?: string | null
  onSyncLogin: () => void
  onSyncLogout: (clearLocalData: boolean) => void
  onSyncNow: () => void
}

export const SettingsModal = memo(function SettingsModal({
  isOpen,
  onClose,
  settings,
  update,
  themeId,
  onThemeChange,
  sessions,
  todos,
  syncStatus,
  syncPending,
  syncLastSyncAt,
  syncProfile,
  syncAvailable,
  syncLoading,
  syncError,
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
    const unlock = lockBodyScroll()
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      unlock()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings & Preferences"
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => {
        playMicroClick('tap')
        onClose()
      }}
    >
      <div
        className="modal-panel panel relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none p-4 sm:rounded-card sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line/70 pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden="true" className="dot bg-accent" />
            <h2 className="label truncate text-fg">Settings</h2>
          </div>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onClose()
            }}
            className="chip"
            aria-label="Close settings"
          >
            <X size={12} />
            Esc
          </button>
        </header>

        {/* Embedded SettingsPanel */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pt-5">
          <SettingsPanel
            settings={settings}
            update={update}
            themeId={themeId}
            onThemeChange={onThemeChange}
            sessions={sessions}
            todos={todos}
            syncStatus={syncStatus}
            syncPending={syncPending}
            syncLastSyncAt={syncLastSyncAt}
            syncProfile={syncProfile}
            syncAvailable={syncAvailable}
            syncLoading={syncLoading}
            syncError={syncError}
            onSyncLogin={onSyncLogin}
            onSyncLogout={onSyncLogout}
            onSyncNow={onSyncNow}
          />
        </div>
      </div>
    </div>
  )
})
