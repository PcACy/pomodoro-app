import { memo, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Settings, Session, TodoItem } from '../../types'
import type { ColorMode, ThemeId } from '../../themes'
import { THEMES, THEME_LIST } from '../../themes'
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
  colorMode: ColorMode
  onColorModeChange: (m: ColorMode) => void
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
  onSyncLogin: () => void
  onSyncLogout: () => void
  onSyncNow: () => void
}

export const SettingsModal = memo(function SettingsModal({
  isOpen,
  onClose,
  settings,
  update,
  colorMode,
  onColorModeChange,
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
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 select-none"
      onClick={() => {
        playMicroClick('tap')
        onClose()
      }}
    >
      <div
        className="modal-panel relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-card bg-surface border border-line p-5 sm:p-7 flex flex-col gap-4 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
            <h2 className="font-mono text-xs sm:text-sm font-bold tracking-widest text-fg uppercase">
              SETTINGS
            </h2>
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted">
              V1.0
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onClose()
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <X size={13} />
            <span>ESC</span>
          </button>
        </div>

        {/* Nothing OS 5.0 & CMF Colorways Theme Selector */}
        {onThemeChange && (
          <div className="pb-3 border-b border-line/60">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-fg">
                  Colorway · Nothing OS & CMF
                </h3>
                <p className="font-sans text-[11px] text-muted">
                  Curated industrial palettes with dynamic hardware accents.
                </p>
              </div>
              {themeId && (
                <span className="font-mono text-[9px] text-muted uppercase tracking-wider px-2 py-0.5 rounded-full border border-line bg-canvas">
                  {THEMES[themeId]?.name || 'Theme'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {THEME_LIST.map((th) => {
                const isSelected = themeId === th.id
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      playMicroClick('toggle')
                      onThemeChange(th.id)
                    }}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border font-mono text-xs transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-fg bg-surface shadow-sm ring-1 ring-fg/20 font-bold text-fg'
                        : 'border-line/70 bg-canvas hover:border-fg/40 text-muted hover:text-fg'
                    }`}
                    title={`${th.name} — ${th.subtitle}`}
                  >
                    <div
                      className="relative h-4 w-4 rounded-full border border-white/20 shrink-0 shadow-inner flex items-center justify-center"
                      style={{ backgroundColor: th.canvas }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shadow-sm"
                        style={{ backgroundColor: th.accent }}
                      />
                    </div>
                    <span className="text-[11px] uppercase tracking-wider">{th.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Embedded SettingsPanel */}
        <div className="flex-1">
          <SettingsPanel
            settings={settings}
            update={update}
            colorMode={colorMode}
            onColorModeChange={onColorModeChange}
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
            onSyncLogin={onSyncLogin}
            onSyncLogout={onSyncLogout}
            onSyncNow={onSyncNow}
          />
        </div>
      </div>
    </div>
  )
})
