import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Target, Timer, Trash2, X } from 'lucide-react'
import type { TodoItem } from '../types'
import { useTranslation } from '../hooks/useTranslation'

const TAG_PALETTE = [
  '#8ec07c', // Aqua / Mint
  '#83a598', // Blue / Teal
  '#fabd2f', // Yellow / Amber
  '#d3869b', // Purple / Lavender
  '#b8bb26', // Green
  '#fe8019', // Orange
  '#fb4934', // Red
  '#d65d0e', // Cinnamon
]

export function getTagColor(tag: string): string {
  if (!tag) return '#928374'
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i)
    hash |= 0
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length]
}

interface TagSelectProps {
  value: string
  tags: string[]
  onChange: (tag: string) => void
  noTagLabel: string
  title?: string
  className?: string
}

const TagSelect = memo(function TagSelect({
  value,
  tags,
  onChange,
  noTagLabel,
  title,
  className = '',
}: TagSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const selectedColor = value ? getTagColor(value) : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`tap-spring flex h-[38px] cursor-pointer items-center gap-1.5 px-3 rounded-btn border text-xs font-medium select-none ${
          value
            ? 'border-line/80 bg-raised/70 text-fg hover:border-accent/50'
            : 'border-line/60 bg-raised/40 text-muted hover:border-line hover:text-fg'
        }`}
        title={title}
        aria-label={title}
        aria-expanded={isOpen}
      >
        {value ? (
          <>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: selectedColor || '#8ec07c' }}
            />
            <span className="max-w-[80px] sm:max-w-[110px] truncate">{value}</span>
          </>
        ) : (
          <span className="text-muted">{noTagLabel}</span>
        )}
        <ChevronDown
          size={13}
          className={`shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-fg' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 sm:w-52 p-1.5 rounded-2xl bg-surface/95 border border-line shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-0.5 select-none animate-fade-in">
          {/* Option: No Tag */}
          <button
            type="button"
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-left transition-all cursor-pointer active:scale-[0.98] ${
              !value
                ? 'bg-accent/15 text-fg font-semibold'
                : 'text-muted hover:bg-raised/70 hover:text-fg'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full border border-dashed border-muted/60 shrink-0" />
              <span>{noTagLabel}</span>
            </span>
            {!value && <Check size={14} className="shrink-0 text-accent" />}
          </button>

          {/* Option: All user tags */}
          {tags.map((t) => {
            const color = getTagColor(t)
            const isSelected = value === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-left transition-all cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? 'bg-accent/15 text-fg font-semibold'
                    : 'text-muted hover:bg-raised/70 hover:text-fg'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-fg">{t}</span>
                </span>
                {isSelected && <Check size={14} className="shrink-0 text-accent" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
})

interface Props {
  todos: TodoItem[]
  tags: string[]
  activeTodoId: string | null
  timerRunning?: boolean
  onAdd: (title: string, tag: string) => void
  onToggle: (id: string) => void
  onEdit: (id: string, patch: { title: string; tag: string }) => void
  onRemove: (id: string) => void
  onFocus: (id: string) => void
}

export const TodoList = memo(function TodoList({
  todos,
  tags,
  activeTodoId,
  timerRunning = false,
  onAdd,
  onToggle,
  onEdit,
  onRemove,
  onFocus,
}: Props) {
  const { t: tr } = useTranslation()
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState(tags[0] ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTag, setEditTag] = useState('')

  const activeTag = tag && tags.includes(tag) ? tag : ''

  // --- Delete choreography: exit animation + FLIP glide for siblings -------
  // The removed row fades/slides out (transform+opacity only); after it is
  // unmounted, remaining rows are inverted by their vertical delta and eased
  // back to identity so the list closes the gap without a visible jump.
  const listRef = useRef<HTMLUListElement>(null)
  const prevTopsRef = useRef<Map<string, number>>(new Map())
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set())
  const cleanupTimersRef = useRef<number[]>([])
  useLayoutEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach((id) => window.clearTimeout(id))
      cleanupTimersRef.current = []
    }
  }, [])

  const captureRowTops = useCallback(() => {
    const ul = listRef.current
    if (!ul) return
    prevTopsRef.current = new Map(
      Array.from(ul.querySelectorAll<HTMLElement>('[data-todo-id]')).map((el) => [
        el.dataset.todoId as string,
        el.getBoundingClientRect().top,
      ]),
    )
  }, [])

  const handleRemove = useCallback(
    (id: string) => {
      if (exitingIds.has(id)) return
      captureRowTops()
      setExitingIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      const timer = window.setTimeout(() => {
        onRemove(id)
        setExitingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 170)
      cleanupTimersRef.current.push(timer)
    },
    [exitingIds, onRemove, captureRowTops],
  )

  // FLIP: after React commits the removal, translate siblings to their old
  // positions and release them with a spring ease (compositor-only).
  useLayoutEffect(() => {
    const prevTops = prevTopsRef.current
    if (prevTops.size === 0 || !listRef.current) return
    prevTopsRef.current = new Map()
    const rows = Array.from(listRef.current.querySelectorAll<HTMLElement>('[data-todo-id]'))
    const moved: HTMLElement[] = []
    for (const row of rows) {
      const before = prevTops.get(row.dataset.todoId as string)
      if (before == null) continue
      const dy = before - row.getBoundingClientRect().top
      if (Math.abs(dy) <= 1) continue
      moved.push(row)
      row.style.transition = 'none'
      row.style.transform = `translateY(${dy}px)`
    }
    if (moved.length === 0) return
    void listRef.current.offsetHeight // single reflow, then hand off to compositor
    for (const row of moved) {
      row.classList.add('todo-flip')
      row.style.transition = 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1)'
      row.style.transform = ''
    }
    const settle = window.setTimeout(() => {
      for (const row of moved) {
        row.style.transition = ''
        row.classList.remove('todo-flip')
      }
    }, 300)
    cleanupTimersRef.current.push(settle)
  }, [todos])

  const submitAdd = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd(trimmed, activeTag)
    setTitle('')
  }

  const startEdit = (t: TodoItem) => {
    setEditingId(t.id)
    setEditTitle(t.title)
    setEditTag(t.tag || '')
  }

  const submitEdit = (id: string) => {
    const trimmed = editTitle.trim()
    if (!trimmed) {
      setEditingId(null)
      return
    }
    onEdit(id, { title: trimmed, tag: editTag })
    setEditingId(null)
  }

  return (
    <section className="card flex w-full max-w-md 2xl:max-w-lg flex-col gap-4 p-6 2xl:p-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">{tr.todo.title}</h3>
        <span className="text-xs text-muted">
          {tr.todo.doneCount(todos.filter((x) => x.done).length, todos.length)}
        </span>
      </div>

      {/* Unified Input Group */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitAdd()
            }
          }}
          placeholder={tr.todo.addTaskPlaceholder || tr.todo.addPlaceholder}
          className="input h-[38px] min-w-0 flex-1 font-mono text-sm py-2"
          maxLength={80}
        />

        <TagSelect
          value={activeTag}
          tags={tags}
          onChange={setTag}
          noTagLabel={tr.todo.noTag}
          title={tr.todo.selectTag || tr.todo.tag}
        />

        <button
          type="button"
          onClick={submitAdd}
          disabled={!title.trim()}
          className="btn-primary shrink-0 h-[38px] w-[38px] p-0 flex items-center justify-center active:scale-[0.94] disabled:opacity-40 disabled:pointer-events-none"
          title={tr.todo.add}
          aria-label={tr.todo.add}
        >
          <Plus size={18} />
        </button>
      </div>

      {todos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{tr.todo.empty}</p>
      ) : (
        <ul ref={listRef} className="flex flex-col gap-1.5 2xl:gap-2">
          {todos.map((t) => (
            <li
              key={t.id}
              data-todo-id={t.id}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('button, input, select, textarea') || editingId === t.id) return
                onFocus(t.id)
              }}
              className={`group flex items-center gap-2 rounded-btn border px-3 py-2 2xl:px-4 2xl:py-3 transition-colors ${
                exitingIds.has(t.id) ? 'animate-todo-exit' : 'animate-todo-in'
              } ${
                activeTodoId === t.id
                  ? 'border-line border-l-2 border-l-accent bg-accent/[0.04] shadow-sm'
                  : 'border-line hover:bg-raised/35'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle(t.id)
                }}
                title={t.done ? tr.todo.reopen : tr.todo.done}
                aria-label={t.done ? tr.todo.reopen : tr.todo.done}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150 active:scale-90 ${
                  t.done ? 'border-success bg-success text-on-accent' : 'border-line text-transparent hover:border-accent'
                }`}
              >
                <Check
                  size={13}
                  className={`transition-transform duration-150 ${t.done ? 'scale-100 animate-check-pop' : 'scale-0'}`}
                />
              </button>

              {editingId === t.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitEdit(t.id)
                      else if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    className="input h-8 min-w-0 flex-1 py-1 text-sm font-mono"
                    maxLength={80}
                  />
                  <TagSelect
                    value={editTag}
                    tags={tags}
                    onChange={setEditTag}
                    noTagLabel={tr.todo.noTag}
                    title={tr.todo.selectTag || tr.todo.tag}
                    className="shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => submitEdit(t.id)}
                    className="btn-primary tap-spring flex h-8 w-8 shrink-0 items-center justify-center p-0"
                    title={tr.todo.save}
                    aria-label={tr.todo.save}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="btn-ghost tap-spring flex h-8 w-8 shrink-0 items-center justify-center p-0"
                    title={tr.todo.cancel}
                    aria-label={tr.todo.cancel}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className={`relative truncate text-sm transition-colors duration-300 ${
                          t.done ? 'text-muted opacity-60' : 'font-medium text-fg'
                        }`}
                      >
                        {t.title}
                        <span aria-hidden="true" className={`todo-strike ${t.done ? 'todo-strike--done' : ''}`} />
                      </span>
                      {activeTodoId === t.id && timerRunning && !t.done && (
                        <span className="flex h-1.5 w-1.5 items-center justify-center shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted">
                      <Timer size={11} className="text-accent/80" /> x{t.pomodoros}
                    </span>
                  </div>
                  {t.tag && (
                    <span
                      className="tag-badge shrink-0 rounded-badge border px-2 py-0.5 font-mono text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${getTagColor(t.tag)}28`,
                        color: getTagColor(t.tag),
                        borderColor: `${getTagColor(t.tag)}58`,
                      }}
                    >
                      <span
                        className="tag-dot mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle shadow-sm"
                        style={{ backgroundColor: getTagColor(t.tag) }}
                      />
                      {t.tag}
                    </span>
                  )}
                </>
              )}

              {editingId !== t.id && (
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFocus(t.id)
                    }}
                    title={activeTodoId === t.id ? tr.todo.unselectFocus : tr.todo.selectFocus}
                    aria-label={activeTodoId === t.id ? tr.todo.unselectFocus : tr.todo.selectFocus}
                    className={`rounded-sm p-1.5 transition-colors ${
                      activeTodoId === t.id
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted hover:bg-raised hover:text-fg'
                    }`}
                  >
                    <Target size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(t)
                    }}
                    title={tr.todo.edit}
                    aria-label={tr.todo.edit}
                    className="rounded-sm p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(t.id)
                    }}
                    title={tr.todo.delete}
                    aria-label={tr.todo.delete}
                    className="tap-spring rounded-sm p-1.5 text-muted transition-colors hover:bg-raised hover:text-accent"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
})