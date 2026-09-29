import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Target, Trash2, X } from 'lucide-react'
import type { TodoItem } from '../types'
import { useTranslation } from '../hooks/useTranslation'
import { playMicroClick } from '../lib/sound'

// Tag identity colours. Deliberately theme-agnostic: a tag must keep the
// same colour across colorways so the user never loses visual grouping.
const TAG_PALETTE = ['#8a8a90', '#c9c9cf', '#5c5c62'] as const
const URGENT_TAGS = new Set(['urgent', 'wichtig', 'dringend', 'critical'])

export function getTagColor(tag: string): string {
  if (!tag) return '#5c5c62'
  if (URGENT_TAGS.has(tag.trim().toLowerCase())) return '#d71921'
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
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-pill border px-2.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
          value
            ? 'border-fg/40 bg-transparent text-fg'
            : 'border-line bg-transparent text-muted hover:border-fg/40 hover:text-fg'
        }`}
        title={title}
        aria-label={title}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {value ? (
          <>
            <span
              aria-hidden="true"
              className="dot"
              style={{ backgroundColor: selectedColor || '#ffffff' }}
            />
            <span className="max-w-[80px] truncate sm:max-w-[140px]">{value}</span>
          </>
        ) : (
          <span className="truncate">{noTagLabel}</span>
        )}
        <ChevronDown
          size={12}
          className={`shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-fg' : ''
          }`}
        />
      </button>

      {/* Dropdown: same panel chrome as every other surface */}
      {isOpen ? (
        <div
          role="listbox"
          className="panel absolute left-0 top-full z-50 mt-1.5 flex w-52 flex-col gap-0.5 p-1"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-control px-3 py-2 text-left font-mono text-xs uppercase transition-colors hover:bg-fg/[0.06] ${
              !value ? 'bg-fg/[0.06] text-fg' : 'text-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="dot border border-line" />
              <span>{noTagLabel}</span>
            </span>
            {!value ? <Check size={13} className="shrink-0 text-accent" /> : null}
          </button>

          {tags.map((t) => {
            const color = getTagColor(t)
            const isSelected = value === t
            return (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(t)
                  setIsOpen(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-control px-3 py-2 text-left font-mono text-xs uppercase transition-colors hover:bg-fg/[0.06] ${
                  isSelected ? 'bg-fg/[0.06] text-fg' : 'text-muted'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="dot shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{t}</span>
                </span>
                {isSelected ? <Check size={13} className="shrink-0 text-accent" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
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

  // The tag list can change while this component is mounted (tags added or
  // removed in Settings, or synced from another tab). A selected tag that no
  // longer exists would otherwise linger in state and pre-select a stale
  // value the next time the dropdown opens.
  useEffect(() => {
    if (tag !== '' && !tags.includes(tag)) {
      setTag(tags[0] ?? '')
    }
  }, [tags, tag])

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
    const hashMatch = trimmed.match(/#([\w\u00C0-\u017F-]+)/)
    let parsedTitle = trimmed
    let parsedTag = activeTag
    if (hashMatch) {
      parsedTag = hashMatch[1]
      parsedTitle = trimmed.replace(hashMatch[0], '').trim()
    }
    // A tag-only input ("#work") keeps the raw input as title, mirroring the
    // task inbox parser — silently dropping it diverges by entry point.
    // `trimmed` is non-empty here (checked above), so parsedTitle is too.
    if (!parsedTitle) parsedTitle = trimmed
    playMicroClick('pop')
    onAdd(parsedTitle, parsedTag)
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
    <section className="flex w-full flex-col gap-3">
      {/* Integrated hardware pill input */}
      <div className="relative flex w-full items-center rounded-pill border border-line bg-canvas py-1 pl-4 pr-1.5 transition-colors focus-within:border-fg/60">
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
          placeholder={tr.todo.addPlaceholder || 'Add a task…'}
          aria-label={tr.todo.add}
          className="min-w-0 flex-1 bg-transparent pr-2 font-mono text-xs text-fg placeholder:text-muted/70 focus:outline-none"
          maxLength={80}
        />

        <div className="flex shrink-0 items-center gap-1.5">
          <TagSelect
            value={activeTag}
            tags={tags}
            onChange={setTag}
            noTagLabel={tr.todo.noTag}
            title={tr.todo.selectTag || tr.todo.tag}
          />

          <kbd className="kbd hidden sm:inline-flex">
            ⏎
          </kbd>

          <button
            type="button"
            onClick={submitAdd}
            disabled={!title.trim()}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill transition-all duration-150 ${
              title.trim()
                ? 'cursor-pointer bg-fg text-canvas hover:bg-accent hover:text-white active:scale-95'
                : 'pointer-events-none cursor-not-allowed bg-transparent text-muted opacity-30'
            }`}
            title={tr.todo.add}
            aria-label={tr.todo.add}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {todos.length === 0 ? (
        <div className="empty py-10">
          <p className="label">Inbox clear</p>
          <p className="max-w-xs text-xs text-muted">
            {tr.todo.empty || 'No tasks yet — add your first one above.'}
          </p>
        </div>
      ) : (
        <ul ref={listRef} className="flex flex-col gap-1.5">
          {todos.map((t) => (
            <li
              key={t.id}
              data-todo-id={t.id}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('button, input, select, textarea') || editingId === t.id) return
                playMicroClick('toggle')
                onFocus(t.id)
              }}
              className={`group flex items-center gap-2.5 rounded-control border px-3 py-2.5 transition-colors 2xl:px-4 ${
                exitingIds.has(t.id) ? 'animate-todo-exit' : 'animate-todo-in'
              } ${
                activeTodoId === t.id
                  ? 'border-accent/35 bg-accent/[0.07]'
                  : 'border-line hover:border-fg/25 hover:bg-fg/[0.03]'
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
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-xs border transition-colors ${
                    t.done ? 'border-fg bg-fg text-canvas' : 'border-line'
                  }`}
                >
                  {t.done ? <Check size={11} strokeWidth={3} /> : null}
                </span>
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
                    className="input h-9 min-w-0 flex-1 py-0 font-mono text-xs"
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
                    className="btn-primary flex h-9 w-9 shrink-0 items-center justify-center !p-0"
                    title={tr.todo.save}
                    aria-label={tr.todo.save}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="btn-ghost flex h-9 w-9 shrink-0 items-center justify-center !p-0"
                    title={tr.todo.cancel}
                    aria-label={tr.todo.cancel}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className={`relative truncate text-sm transition-opacity duration-300 ${
                          t.done ? 'text-muted opacity-60' : 'font-medium text-fg'
                        }`}
                      >
                        {t.title}
                        <span aria-hidden="true" className={`todo-strike ${t.done ? 'todo-strike--done' : ''}`} />
                      </span>
                      {activeTodoId === t.id && timerRunning && !t.done ? (
                        <span className="dot shrink-0 bg-accent animate-pulse" />
                      ) : null}
                    </div>
                    {t.pomodoros > 0 ? (
                      <span className="num text-[10px] uppercase tracking-wider text-muted">
                        {t.pomodoros} {tr.dashboard.sessions.toLowerCase()}
                      </span>
                    ) : null}
                  </div>
                  {t.tag ? (
                    <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted sm:inline-flex">
                      <span
                        aria-hidden="true"
                        className="dot"
                        style={{ backgroundColor: getTagColor(t.tag) }}
                      />
                      {t.tag}
                    </span>
                  ) : null}
                </>
              )}

              {editingId !== t.id && (
                <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-150 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playMicroClick('toggle')
                      onFocus(t.id)
                    }}
                    title={activeTodoId === t.id ? tr.todo.unselectFocus : tr.todo.selectFocus}
                    aria-label={activeTodoId === t.id ? tr.todo.unselectFocus : tr.todo.selectFocus}
                    className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-control transition-colors ${
                      activeTodoId === t.id
                        ? 'bg-fg text-canvas'
                        : 'text-muted hover:bg-fg/[0.06] hover:text-fg'
                    }`}
                  >
                    <Target size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(t)
                    }}
                    title={tr.todo.edit}
                    aria-label={tr.todo.edit}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-control text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(t.id)
                    }}
                    title={tr.todo.delete}
                    aria-label={tr.todo.delete}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-control text-muted transition-colors hover:bg-fg/[0.06] hover:text-accent"
                  >
                    <Trash2 size={13} />
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