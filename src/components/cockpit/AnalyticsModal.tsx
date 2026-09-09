import { memo, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Session, Settings, TodoItem } from '../../types'
import type { ColorMode } from '../../themes'
import { Dashboard } from '../Dashboard'
import { playMicroClick } from '../../lib/sound'
import { lockBodyScroll } from '../../lib/modalScrollLock'

interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  sessions: Session[]
  settings: Settings
  colorMode: ColorMode
  todos: TodoItem[]
  onImportSettings: (s: unknown) => void
}

export const AnalyticsModal = memo(function AnalyticsModal({
  isOpen,
  onClose,
  sessions,
  settings,
  colorMode,
  todos,
  onImportSettings,
}: AnalyticsModalProps) {
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
      aria-label="Analytics & Metrics"
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 select-none"
      onClick={() => {
        playMicroClick('tap')
        onClose()
      }}
    >
      <div
        className="modal-panel relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-card bg-surface border border-line p-5 sm:p-7 flex flex-col gap-4 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex flex-col gap-0.5 font-mono">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EB1E23] animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold tracking-widest text-fg uppercase">
                PERFORMANCE // METRICS
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] tracking-wider text-muted uppercase">
              SYSTEM TELEMETRY & LOGGED SESSIONS
            </span>
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

        {/* Embedded Dashboard */}
        <div className="flex-1">
          <Dashboard
            sessions={sessions}
            settings={settings}
            colorMode={colorMode}
            todos={todos}
            onImportSettings={onImportSettings}
          />
        </div>
      </div>
    </div>
  )
})
