import { memo, useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react'
import { Check, Maximize2, Plus, Target, Trash2 } from 'lucide-react'
import type { TodoItem } from '../../types'
import { BentoCard } from './BentoCard'
import { getTagColor } from '../TodoList'
import { playMicroClick } from '../../lib/sound'
import { useTranslation } from '../../hooks/useTranslation'

interface TaskInboxCardProps {
  todos: TodoItem[]
  tags?: string[]
  activeTodoId: string | null
  onToggle: (id: string) => void
  onFocus: (id: string) => void
  onAdd: (title: string, tag: string) => void
  onRemove: (id: string) => void
  onOpenTodoManager: () => void
  className?: string
}

function parseTaskInput(input: string, fallbackTag: string): { title: string; tag: string } {
  const hashMatch = input.match(/#([\w\u00C0-\u017F-]+)/)
  if (hashMatch) {
    const tag = hashMatch[1]
    const title = input.replace(hashMatch[0], '').trim()
    return { title: title || input.trim(), tag }
  }
  return { title: input.trim(), tag: fallbackTag }
}

export const TaskInboxCard = memo(function TaskInboxCard({
  todos,
  tags = [],
  activeTodoId,
  onToggle,
  onFocus,
  onAdd,
  onRemove,
  onOpenTodoManager,
  className = '',
}: TaskInboxCardProps) {
  const { t: tr } = useTranslation()
  const [quickTitle, setQuickTitle] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false)
  const tagDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isTagDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setIsTagDropdownOpen(false)
      }
    }
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTagDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isTagDropdownOpen])

  const pendingTodos = todos.filter((t) => !t.done).slice(0, 4)
  const remainingCount = Math.max(0, todos.filter((t) => !t.done).length - 4)

  const submitTask = useCallback(() => {
    if (!quickTitle.trim()) return
    const { title, tag } = parseTaskInput(quickTitle, selectedTag)
    if (!title) return
    playMicroClick('pop')
    onAdd(title, tag)
    setQuickTitle('')
    setSelectedTag('')
    setIsTagDropdownOpen(false)
  }, [quickTitle, selectedTag, onAdd])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitTask()
      }
    },
    [submitTask],
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
      <div className="relative mb-3 flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="+ Add quick task (#tag or select)..."
            className="w-full rounded-[8px] border border-line bg-canvas pl-3 pr-8 py-1.5 text-xs text-fg placeholder:text-muted/60 font-mono focus:outline-none focus:border-fg/50 transition-colors"
          />
          {quickTitle.trim() && (
            <button
              type="button"
              onClick={submitTask}
              className="absolute right-1.5 rounded p-1 text-muted hover:text-fg cursor-pointer"
              title="Add task"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Quick Tag Selector Pill */}
        {tags.length > 0 && (
          <div className="relative shrink-0" ref={tagDropdownRef}>
            <div
              className={`h-7 px-2.5 rounded-lg border text-[10px] font-mono tracking-wider uppercase transition-colors flex items-center gap-1.5 select-none ${
                selectedTag
                  ? 'border-fg/40 bg-surface text-fg'
                  : 'border-line bg-canvas text-muted hover:text-fg hover:border-fg/30'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                aria-expanded={isTagDropdownOpen}
                aria-haspopup="listbox"
                className="flex min-w-0 flex-1 items-center gap-1.5 bg-transparent cursor-pointer"
                title="Select tag for this task"
              >
                {selectedTag ? (
                  <>
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: getTagColor(selectedTag),
                      }}
                    />
                    <span className="max-w-[70px] truncate uppercase">{selectedTag}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted/70">#</span>
                    <span>TAG</span>
                  </>
                )}
              </button>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag('')}
                  className="ml-0.5 shrink-0 cursor-pointer text-muted hover:text-fg"
                  title="Remove tag"
                  aria-label="Remove tag"
                >
                  ×
                </button>
              )}
            </div>

            {isTagDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 min-w-[130px] rounded-lg border border-line bg-surface p-1 shadow-none flex flex-col gap-0.5 font-mono text-[10px] tracking-wider uppercase">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag('')
                    setIsTagDropdownOpen(false)
                  }}
                  className={`px-2 py-1 rounded text-left flex items-center justify-between hover:bg-canvas transition-colors cursor-pointer ${
                    !selectedTag ? 'text-fg font-medium bg-canvas/60' : 'text-muted'
                  }`}
                >
                  <span>{tr.todo.noTag.toUpperCase()}</span>
                  {!selectedTag && <span className="text-[9px]">✓</span>}
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSelectedTag(tag)
                      setIsTagDropdownOpen(false)
                    }}
                    className={`px-2 py-1 rounded text-left flex items-center gap-1.5 hover:bg-canvas transition-colors cursor-pointer ${
                      selectedTag === tag ? 'text-fg font-medium bg-canvas/60' : 'text-muted'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: getTagColor(tag),
                      }}
                    />
                    <span className="truncate flex-1 uppercase">{tag}</span>
                    {selectedTag === tag && <span className="text-[9px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
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
                className={`group flex items-center justify-between gap-2.5 px-3 py-2 rounded-[8px] border transition-colors cursor-pointer ${
                  isActive
                    ? 'border-fg bg-surface-raised text-fg'
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
                    <span className="flex items-center gap-1 font-mono text-[9px] text-muted shrink-0 uppercase tracking-wider">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: tagColor,
                        }}
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playMicroClick('tap')
                      onRemove(todo.id)
                    }}
                    title={tr.todo.delete}
                    aria-label={tr.todo.delete}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-accent transition-opacity cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
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
