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

  const pendingTodos = todos.filter((t) => !t.done)
  const remainingCount = 0

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
      label="Task Inbox"
      action={
        <button
          type="button"
          onClick={() => {
            playMicroClick('tap')
            onOpenTodoManager()
          }}
          className="font-sans text-[11px] font-medium px-2.5 py-1 rounded-full border border-line bg-canvas hover:border-fg/40 text-muted hover:text-fg transition-colors flex items-center gap-1.5 cursor-pointer select-none active:scale-95"
        >
          <Maximize2 size={12} />
          Expand
        </button>
      }
      className={className}
      contentClassName="justify-between h-full min-h-0"
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
            className="w-full rounded-[8px] border border-line bg-surface/50 hover:bg-surface focus:bg-surface pl-3 pr-8 py-1.5 text-xs text-fg placeholder:text-muted/60 font-mono focus:outline-none focus:border-fg/50 transition-colors shadow-xs"
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
              className={`h-8 px-2.5 rounded-lg border text-xs font-sans transition-colors flex items-center gap-1.5 select-none ${
                selectedTag
                  ? 'border-fg/40 bg-surface text-fg font-medium'
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
                      className="h-1.5 w-1.5 rounded-full shrink-0 -translate-y-px"
                      style={{
                        backgroundColor: getTagColor(selectedTag),
                      }}
                    />
                    <span className="max-w-[70px] truncate">{selectedTag}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted/70">#</span>
                    <span>Tag</span>
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
              <div className="absolute right-0 top-full mt-1 z-30 min-w-[130px] rounded-lg border border-line bg-surface p-1 shadow-none flex flex-col gap-0.5 font-sans text-xs">
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
                  <span>{tr.todo.noTag}</span>
                  {!selectedTag && <span className="text-[10px]">✓</span>}
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
                      className="h-1.5 w-1.5 rounded-full shrink-0 -translate-y-px"
                      style={{
                        backgroundColor: getTagColor(tag),
                      }}
                    />
                    <span className="truncate flex-1">{tag}</span>
                    {selectedTag === tag && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto no-scrollbar pr-0.5">
        {pendingTodos.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-6 px-4 my-auto border border-dashed border-line/60 rounded-2xl select-none">
            {/* Technical Hardware Status */}
            <div className="font-mono text-[11px] font-bold tracking-widest text-muted uppercase mb-1">
              INBOX CLEAR
            </div>

            <p className="font-sans text-xs text-muted/70 text-center max-w-[240px] mb-4">
              {tr.todo.empty || 'All tasks completed or none queued'}
            </p>

            {/* Keyboard Shortcuts Hint Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] text-muted mb-5">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface text-fg font-semibold shadow-xs">↵</kbd>
                <span>Add Task</span>
              </span>
              <span className="text-muted/30">·</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface text-fg font-semibold shadow-xs">#</kbd>
                <span>Tag</span>
              </span>
              <span className="text-muted/30">·</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface text-fg font-semibold shadow-xs">1</kbd>
                <span>Focus</span>
              </span>
            </div>

            {/* Quick Starter Chips */}
            <div className="flex flex-col items-center gap-1.5 w-full max-w-[320px]">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted/60">
                Quick Start Templates
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {[
                  { title: 'Deep Work Session', tag: 'focus' },
                  { title: 'Code Review & Audit', tag: 'code' },
                  { title: 'Admin & Inbox Zero', tag: 'admin' },
                ].map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => {
                      playMicroClick('pop')
                      onAdd(preset.title, preset.tag)
                    }}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-full border border-line bg-surface hover:border-fg/40 hover:bg-canvas text-muted hover:text-fg transition-all cursor-pointer active:scale-95"
                    title={`Create task: "${preset.title}"`}
                  >
                    + {preset.title}
                  </button>
                ))}
              </div>
            </div>
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
                className={`group flex min-h-[44px] items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isActive
                    ? 'border-fg bg-surface-raised text-fg'
                    : 'border-line/60 bg-canvas/40 hover:border-line hover:bg-canvas text-fg/90'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Mechanical Checkbox with Fitts's Law touch target */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playMicroClick('tick')
                      onToggle(todo.id)
                    }}
                    className="h-8 w-8 -ml-1.5 shrink-0 flex items-center justify-center cursor-pointer text-muted hover:text-fg"
                    aria-label={todo.done ? 'Mark as incomplete' : 'Mark as done'}
                  >
                    <div
                      className={`h-4 w-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                        todo.done
                          ? 'bg-fg border-fg text-canvas'
                          : 'border-line bg-canvas hover:border-fg/40'
                      }`}
                    >
                      {todo.done && <Check size={11} strokeWidth={3} />}
                    </div>
                  </button>

                  <span className="font-sans text-xs truncate">{todo.title}</span>

                  {todo.tag && (
                    <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-muted shrink-0">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0 -translate-y-px"
                        style={{
                          backgroundColor: tagColor,
                        }}
                      />
                      <span>{todo.tag}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {isActive ? (
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse mr-1" />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        playMicroClick('tap')
                        onFocus(todo.id)
                      }}
                      title="Set as active focus"
                      className="opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-100 h-8 w-8 flex items-center justify-center text-muted hover:text-fg transition-opacity cursor-pointer active:scale-95"
                    >
                      <Target size={14} />
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
                    className="opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-100 h-8 w-8 flex items-center justify-center text-muted hover:text-accent transition-opacity cursor-pointer active:scale-95"
                  >
                    <Trash2 size={14} />
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
            className="text-left font-sans text-xs text-muted hover:text-fg pt-1 transition-colors cursor-pointer"
          >
            + {remainingCount} more tasks in inbox
          </button>
        )}
      </div>
    </BentoCard>
  )
})
