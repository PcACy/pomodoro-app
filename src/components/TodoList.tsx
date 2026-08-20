import { memo, useState } from 'react'
import { Check, Pencil, Plus, Target, Trash2, X } from 'lucide-react'
import type { TodoItem } from '../types'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  todos: TodoItem[]
  tags: string[]
  activeTodoId: string | null
  onAdd: (title: string, tag: string) => void
  onToggle: (id: string) => void
  onEdit: (id: string, patch: { title: string; tag: string }) => void
  onRemove: (id: string) => void
  onFocus: (id: string) => void
}

export const TodoList = memo(function TodoList({ todos, tags, activeTodoId, onAdd, onToggle, onEdit, onRemove, onFocus }: Props) {
  const { t: tr } = useTranslation()
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState(tags[0] ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTag, setEditTag] = useState('')

  const activeTag = tags.includes(tag) ? tag : (tags[0] ?? '')

  const submitAdd = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd(trimmed, activeTag)
    setTitle('')
  }

  const startEdit = (t: TodoItem) => {
    setEditingId(t.id)
    setEditTitle(t.title)
    setEditTag(tags.includes(t.tag) ? t.tag : (tags[0] ?? ''))
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
    <section className="card flex w-full max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">{tr.todo.title}</h3>
        <span className="text-xs text-muted">
          {tr.todo.doneCount(todos.filter((x) => x.done).length, todos.length)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
          placeholder={tr.todo.addPlaceholder}
          className="input"
          maxLength={80}
        />
        <select value={activeTag} onChange={(e) => setTag(e.target.value)} className="input w-auto shrink-0" title={tr.todo.tag}>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <button type="button" onClick={submitAdd} className="btn-primary shrink-0 px-3" title={tr.todo.add}>
          <Plus size={16} />
        </button>
      </div>

      {todos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{tr.todo.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {todos.map((t) => (
            <li
              key={t.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                activeTodoId === t.id ? 'border-accent/60 bg-accent/10' : 'border-line'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                title={t.done ? tr.todo.reopen : tr.todo.done}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  t.done ? 'border-accent bg-accent text-on-accent' : 'border-line text-transparent hover:border-accent'
                }`}
              >
                <Check size={13} />
              </button>

              {editingId === t.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitEdit(t.id)
                      else if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    className="input py-1 text-sm"
                    maxLength={80}
                  />
                  <select value={editTag} onChange={(e) => setEditTag(e.target.value)} className="input w-auto py-1 text-sm">
                    {tags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => submitEdit(t.id)} className="btn-primary shrink-0 px-2 py-1" title={tr.todo.save}>
                    <Check size={14} />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="btn-ghost shrink-0 px-2 py-1" title={tr.todo.cancel}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`truncate text-sm ${
                        t.done ? 'text-muted line-through' : 'text-fg'
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="text-[11px] text-muted">🍅 x{t.pomodoros}</span>
                  </div>
                  {t.tag && (
                    <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-[10px] font-medium text-fg">
                      {t.tag}
                    </span>
                  )}
                </>
              )}

              {editingId !== t.id && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onFocus(t.id)}
                    title={tr.todo.selectFocus}
                    className={`rounded-md p-1.5 transition-colors ${
                      activeTodoId === t.id
                        ? 'bg-accent/15 text-accent'
                        : 'text-muted hover:bg-raised hover:text-fg'
                    }`}
                  >
                    <Target size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    title={tr.todo.edit}
                    className="rounded-md p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(t.id)}
                    title={tr.todo.delete}
                    className="rounded-md p-1.5 text-muted transition-colors hover:bg-raised hover:text-accent"
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