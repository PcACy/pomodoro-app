import { memo, useState, useCallback, type KeyboardEvent } from 'react'
import { Check, Maximize2, Plus, Target } from 'lucide-react'
import type { TodoItem } from '../../types'
import { BentoCard } from './BentoCard'
import { getTagColor } from '../TodoList'
import { playMicroClick } from '../../lib/sound'

interface TaskInboxCardProps {
  todos: TodoItem[]
  activeTodoId: string | null
  onToggle: (id: string) => void
  onFocus: (id: string) => void
  onAdd: (title: string, tag: string) => void
  onOpenTodoManager: () => void
  className?: string
}

export const TaskInboxCard = memo(function TaskInboxCard({
  todos,
  activeTodoId,
  onToggle,
  onFocus,
  onAdd,
  onOpenTodoManager,
  className = '',
}: TaskInboxCardProps) {
  const [quickTitle, setQuickTitle] = useState('')

  const pendingTodos = todos.filter((t) => !t.done).slice(0, 4)
  const remainingCount = Math.max(0, todos.filter((t) => !t.done).length - 4)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && quickTitle.trim()) {
        e.preventDefault()
        playMicroClick('pop')
        onAdd(quickTitle.trim(), '')
        setQuickTitle('')
      }
    },
    [quickTitle, onAdd],
  )

  return (
    <BentoCard
      label="TASK INBOX"
      action={
        <button
          type="button"
          onClick={() => {
            playMicroClick('tap')
            onOpenTodoManager()
          }}
          className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg tracking-wider uppercase transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Maximize2 size={10} />
          EXPAND
        </button>
      }
      className={className}
    >
      {/* Quick Add Bar */}
      <div className="relative mb-3 flex items-center">
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+ Add quick task (Press Enter)..."
          className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-fg placeholder:text-muted/60 font-sans focus:outline-none focus:border-fg/50 transition-colors"
        />
        {quickTitle.trim() && (
          <button
            type="button"
            onClick={() => {
              playMicroClick('pop')
              onAdd(quickTitle.trim(), '')
              setQuickTitle('')
            }}
            className="absolute right-1.5 rounded p-1 text-muted hover:text-fg cursor-pointer"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 flex flex-col gap-1.5">
        {pendingTodos.length === 0 ? (
          <div className="py-4 text-center font-mono text-[11px] text-muted tracking-wider uppercase">
            No pending tasks
          </div>
        ) : (
          pendingTodos.map((todo) => {
            const isActive = todo.id === activeTodoId
            const tagColor = todo.tag ? getTagColor(todo.tag) : undefined

            return (
              <div
                key={todo.id}
                onClick={() => {
                  playMicroClick('tap')
                  onFocus(todo.id)
                }}
                className={`group flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'border-accent bg-surface-raised text-fg'
                    : 'border-line/60 bg-canvas/40 hover:border-line hover:bg-canvas text-fg/90'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Mechanical Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playMicroClick('tick')
                      onToggle(todo.id)
                    }}
                    className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors cursor-pointer ${
                      todo.done
                        ? 'bg-fg border-fg text-canvas'
                        : 'border-line bg-canvas hover:border-fg/40'
                    }`}
                  >
                    {todo.done && <Check size={11} strokeWidth={3} />}
                  </button>

                  <span className="font-sans text-xs truncate">{todo.title}</span>

                  {todo.tag && (
                    <span className="flex items-center gap-1 font-mono text-[9px] text-muted shrink-0">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: tagColor }}
                      />
                      <span>{todo.tag}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        playMicroClick('tap')
                        onFocus(todo.id)
                      }}
                      title="Set as active focus"
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-fg transition-opacity"
                    >
                      <Target size={12} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}

        {remainingCount > 0 && (
          <button
            type="button"
            onClick={onOpenTodoManager}
            className="text-left font-mono text-[10px] text-muted hover:text-fg tracking-wider uppercase pt-1 transition-colors cursor-pointer"
          >
            + {remainingCount} more tasks in inbox
          </button>
        )}
      </div>
    </BentoCard>
  )
})
