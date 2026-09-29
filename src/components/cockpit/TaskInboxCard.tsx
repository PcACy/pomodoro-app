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
  const hashMatch = input.match(/#([\wÀ-ſ-]+)/)
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
  const inputRef = useRef<HTMLInputElement>(null)

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
        inputRef.current?.focus()
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
      indicator={
        <span className="num shrink-0 text-[10px] text-muted">
          {pendingTodos.length} open
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => {
            playMicroClick('tap')
            onOpenTodoManager()
          }}
          className="chip"
        >
          <Maximize2 size={11} />
          Expand
        </button>
      }
      className={className}
      contentClassName="min-h-0"
    >
      {/* Quick Add Bar */}
      <div className="relative mb-3 flex shrink-0 items-center gap-2">
        <div className="relative flex min-w-0 flex-1 items-center">
          <input
            ref={inputRef}
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add task  #tag"
            aria-label="Add quick task"
            className="input h-10 py-0 pl-3.5 pr-10 font-mono text-xs placeholder:text-muted/70"
          />
          {quickTitle.trim() ? (
            <button
              type="button"
              onClick={submitTask}
              className="absolute right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-fg"
              title="Add task"
              aria-label="Add task"
            >
              <Plus size={15} />
            </button>
          ) : null}
        </div>

        {/* Quick Tag Selector */}
        {tags.length > 0 ? (
          <div ref={tagDropdownRef} className="relative shrink-0">
            <div
              className={`flex h-10 items-center rounded-control border transition-colors ${
                selectedTag
                  ? 'border-fg/40 bg-track text-fg'
                  : 'border-line bg-transparent text-muted'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                aria-expanded={isTagDropdownOpen}
                aria-haspopup="listbox"
                className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-3"
                title="Select tag for this task"
              >
                {selectedTag ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="dot"
                      style={{ backgroundColor: getTagColor(selectedTag) }}
                    />
                    <span className="max-w-[70px] truncate font-mono text-xs">
                      {selectedTag}
                    </span>
                  </>
                ) : (
                  <span className="font-mono text-xs"># Tag</span>
                )}
              </button>
              {selectedTag ? (
                <button
                  type="button"
                  onClick={() => setSelectedTag('')}
                  className="mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-fg"
                  title="Remove tag"
                  aria-label="Remove tag"
                >
                  ×
                </button>
              ) : null}
            </div>

            {isTagDropdownOpen ? (
              <div
                role="listbox"
                className="panel absolute right-0 top-full z-30 mt-1.5 flex w-48 flex-col gap-0.5 p-1"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedTag}
                  onClick={() => {
                    setSelectedTag('')
                    setIsTagDropdownOpen(false)
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-fg/[0.06] ${
                    !selectedTag ? 'bg-fg/[0.06] text-fg' : 'text-muted'
                  }`}
                >
                  <span>{tr.todo.noTag}</span>
                  {!selectedTag ? <Check size={12} className="text-accent" /> : null}
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    role="option"
                    aria-selected={selectedTag === tag}
                    onClick={() => {
                      setSelectedTag(tag)
                      setIsTagDropdownOpen(false)
                    }}
                    className={`flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-fg/[0.06] ${
                      selectedTag === tag ? 'bg-fg/[0.06] text-fg' : 'text-muted'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="dot"
                      style={{ backgroundColor: getTagColor(tag) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{tag}</span>
                    {selectedTag === tag ? <Check size={12} className="text-accent" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Task List */}
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {pendingTodos.length === 0 ? (
          <div className="empty">
            <p className="label">
              {todos.length > 0 ? 'All clear' : 'Inbox clear'}
            </p>
            <p className="max-w-[240px] text-xs text-muted">
              {todos.length > 0
                ? 'Every queued task is done.'
                : (tr.todo.empty ?? 'No tasks queued yet.')}
            </p>
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
                className={`group flex min-h-[48px] cursor-pointer items-center justify-between gap-2 rounded-control border px-3 transition-colors ${
                  isActive
                    ? 'border-accent/35 bg-accent/[0.07]'
                    : 'border-line bg-transparent hover:border-fg/25 hover:bg-fg/[0.03]'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playMicroClick('tick')
                      onToggle(todo.id)
                    }}
                    className="-ml-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-fg"
                    aria-label={todo.done ? 'Mark as incomplete' : 'Mark as done'}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-xs border transition-colors ${
                        todo.done
                          ? 'border-fg bg-fg text-canvas'
                          : 'border-line'
                      }`}
                    >
                      {todo.done ? <Check size={11} strokeWidth={3} /> : null}
                    </span>
                  </button>

                  <span className="min-w-0 truncate text-[13px] text-fg">{todo.title}</span>

                  {todo.tag ? (
                    <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline-flex">
                      <span
                        aria-hidden="true"
                        className="dot"
                        style={{ backgroundColor: tagColor }}
                      />
                      {todo.tag}
                    </span>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {isActive ? (
                    <span
                      aria-label="Currently focused"
                      className="dot mr-1.5 bg-accent animate-pulse"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        playMicroClick('tap')
                        onFocus(todo.id)
                      }}
                      title="Set as active focus"
                      aria-label="Set as active focus"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center text-muted opacity-100 transition-colors hover:text-fg active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
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
                    className="flex h-9 w-9 cursor-pointer items-center justify-center text-muted transition-colors hover:text-accent active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </BentoCard>
  )
})
