import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Target, Timer, Trash2, X } from 'lucide-react'
import type { TodoItem } from '../types'
import { useTranslation } from '../hooks/useTranslation'
import { playMicroClick } from '../lib/sound'

const TAG_PALETTE = ['#999999', '#E8E8E8', '#666666'] as const
const URGENT_TAGS = new Set(['urgent', 'wichtig', 'dringend', 'critical'])

export function getTagColor(tag: string): string {
  if (!tag) return '#666666'
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
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-7 cursor-pointer items-center gap-1.5 px-2.5 rounded-full border text-[11px] font-mono uppercase tracking-wider select-none transition-colors ${
          value
            ? 'border-fg/40 bg-canvas text-fg'
            : 'border-line bg-canvas text-muted hover:border-fg/40 hover:text-fg'
        }`}
        title={title}
        aria-label={title}
        aria-expanded={isOpen}
      >
        {value ? (
          <>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: selectedColor || '#ffffff',
              }}
            />
            <span className="max-w-[80px] sm:max-w-[110px] truncate">{value}</span>
          </>
        ) : (
          <span>{noTagLabel}</span>
        )}
        <ChevronDown
          size={12}
          className={`shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-fg' : ''
          }`}
        />
      </button>

      {/* Nothing Dropdown (8px radius, border-visible, flat, no shadows) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 sm:w-52 p-1 rounded-lg bg-surface border border-line z-50 flex flex-col gap-0.5 select-none font-mono text-xs">
          {/* Option: No Tag */}
          <button
            type="button"
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded text-left transition-colors cursor-pointer uppercase ${
              !value
                ? 'border-l-2 border-l-accent bg-surface-raised text-fg font-bold'
                : 'text-muted hover:bg-surface-raised hover:text-fg'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full border border-line shrink-0" />
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
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded text-left transition-colors cursor-pointer uppercase ${
                  isSelected
                    ? 'border-l-2 border-l-accent bg-surface-raised text-fg font-bold'
                    : 'text-muted hover:bg-surface-raised hover:text-fg'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: color,
                    }}
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
    <section className="flex w-full flex-col gap-4">
      {/* Integrated Hardware Pill Input */}
      <div className="relative flex w-full items-center rounded-full border border-line bg-canvas pl-4 pr-1.5 py-1.5 transition-colors focus-within:border-fg">
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
          placeholder={tr.todo.addPlaceholder || 'enter new task...'}
          className="w-full bg-transparent font-mono text-xs text-fg placeholder:text-muted/60 focus:outline-none min-w-0 pr-2"
          maxLength={80}
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <TagSelect
            value={activeTag}
            tags={tags}
            onChange={setTag}
            noTagLabel={tr.todo.noTag}
            title={tr.todo.selectTag || tr.todo.tag}
          />

          <kbd className="hidden select-none rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted/60 sm:inline-block">
            ⏎
          </kbd>

          <button
            type="button"
            onClick={submitAdd}
            disabled={!title.trim()}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 ${
              title.trim()
                ? 'cursor-pointer bg-fg text-canvas opacity-100 hover:bg-accent hover:text-white active:scale-95'
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
        <div className="flex flex-1 items-center justify-center py-10">
          <span className="font-mono text-xs text-muted uppercase tracking-widest px-3 py-1.5 rounded-full border border-line/50 bg-canvas/40">
            [ 0 TASKS IN INBOX · STANDBY ]
          </span>
        </div>
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
              className={`group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 2xl:px-4 2xl:py-3 transition-colors ${
                exitingIds.has(t.id) ? 'animate-todo-exit' : 'animate-todo-in'
              } ${
                activeTodoId === t.id
                  ? 'border-fg bg-surface-raised/40'
                  : 'border-line/70 hover:border-line hover:bg-surface-raised/20'
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
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-border-visible transition-colors cursor-pointer"
              >
                {t.done && <span className="h-2 w-2 rounded-[1px] bg-fg" />}
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
                    className="input h-8 min-w-0 flex-1 py-1 text-xs font-mono"
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
                    className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0"
                    title={tr.todo.save}
                    aria-label={tr.todo.save}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="btn-ghost flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0"
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
                        className={`relative truncate text-sm transition-colors duration-300 ${
                          t.done ? 'text-muted opacity-50' : 'font-medium text-fg'
                        }`}
                      >
                        {t.title}
                        <span aria-hidden="true" className={`todo-strike ${t.done ? 'todo-strike--done' : ''}`} />
                      </span>
                      {activeTodoId === t.id && timerRunning && !t.done && (
                        <span className="flex h-1.5 w-1.5 items-center justify-center shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                        </span>
                      )}
                    </div>
                    {t.pomodoros > 0 && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase text-muted">
                        <Timer size={10} className="text-muted" /> {t.pomodoros}P
                      </span>
                    )}
                  </div>
                  {t.tag && (
                    <span className="flex items-center gap-1.5 shrink-0 rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg/90">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: getTagColor(t.tag),
                        }}
                      />
                      <span>{t.tag}</span>
                    </span>
                  )}
                </>
              )}

              {editingId !== t.id && (
                <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 transition-opacity duration-150 sm:group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFocus(t.id)
                    }}
                    title={activeTodoId === t.id ? tr.todo.unselectFocus : tr.todo.selectFocus}
                    aria-label={activeTodoId === t.id ? tr.todo.unselectFocus : tr.todo.selectFocus}
                    className={`rounded p-1 transition-colors ${
                      activeTodoId === t.id
                        ? 'bg-fg text-canvas'
                        : 'text-muted hover:bg-surface-raised hover:text-fg'
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
                    className="rounded p-1 text-muted transition-colors hover:bg-surface-raised hover:text-fg"
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
                    className="rounded p-1 text-muted transition-colors hover:bg-surface-raised hover:text-accent"
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