import { memo, useEffect } from 'react'
import { X } from 'lucide-react'
import type { TodoItem } from '../../types'
import { TodoList } from '../TodoList'
import { playMicroClick } from '../../lib/sound'
import { lockBodyScroll } from '../../lib/modalScrollLock'

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
    const unlock = lockBodyScroll()
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      unlock()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const doneCount = todos.filter((x) => x.done).length

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Task Manager"
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => {
        playMicroClick('tap')
        onClose()
      }}
    >
      <div
        className="modal-panel panel relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none p-4 sm:rounded-card sm:p-6 lg:max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line/70 pb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden="true" className="dot bg-accent" />
            <h2 className="label truncate text-fg">Task Manager</h2>
            <span className="num shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
              {doneCount}/{todos.length} done
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tap')
              onClose()
            }}
            className="chip"
            aria-label="Close task manager"
          >
            <X size={12} />
            Esc
          </button>
        </header>

        {/* Embedded Full TodoList */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pt-5">
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

