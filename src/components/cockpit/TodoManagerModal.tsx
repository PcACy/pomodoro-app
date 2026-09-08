import { memo, useEffect } from 'react'
import { X } from 'lucide-react'
import type { TodoItem } from '../../types'
import { TodoList } from '../TodoList'
import { playMicroClick } from '../../lib/sound'

interface TodoManagerModalProps {
  isOpen: boolean
  onClose: () => void
  todos: TodoItem[]
  tags: string[]
  activeTodoId: string | null
  timerRunning: boolean
  onAdd: (title: string, tag: string) => void
  onToggle: (id: string) => void
  onEdit: (id: string, patch: { title: string; tag: string }) => void
  onRemove: (id: string) => void
  onFocus: (id: string) => void
}

export const TodoManagerModal = memo(function TodoManagerModal({
  isOpen,
  onClose,
  todos,
  tags,
  activeTodoId,
  timerRunning,
  onAdd,
  onToggle,
  onEdit,
  onRemove,
  onFocus,
}: TodoManagerModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playMicroClick('tap')
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 select-none backdrop-blur-[2px]"
      onClick={() => {
        playMicroClick('tap')
        onClose()
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-card bg-surface border border-line p-5 sm:p-7 flex flex-col gap-4 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <span className="font-mono text-[10px] sm:text-xs tracking-widest text-muted uppercase">
              TASK MANAGER // INBOX & ARCHIVE
            </span>
            <h2 className="font-sans text-lg font-medium text-fg">
              Manage Tasks & Projects
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

        {/* Embedded Full TodoList */}
        <div className="flex-1">
          <TodoList
            todos={todos}
            tags={tags}
            activeTodoId={activeTodoId}
            timerRunning={timerRunning}
            onAdd={onAdd}
            onToggle={onToggle}
            onEdit={onEdit}
            onRemove={onRemove}
            onFocus={onFocus}
          />
        </div>
      </div>
    </div>
  )
})

