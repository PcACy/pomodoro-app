import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  onSave: (notes: string) => void
  onSkip: () => void
}

export function ReflectionModal({ onSave, onSkip }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSkip])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reflection-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSkip()
      }}
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
    >
      <div className="card w-full max-w-sm p-5">
        <h3 id="reflection-title" className="text-sm font-semibold text-fg">{t.reflection.title}</h3>
        <p className="mt-1 text-xs text-muted">{t.reflection.prompt}</p>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSave(value.trim())
            }
          }}
          placeholder={t.reflection.placeholder}
          rows={3}
          maxLength={500}
          className="input mt-3 resize-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onSkip} className="btn-ghost text-xs">
            {t.reflection.skip} <span className="kbd">Esc</span>
          </button>
          <button
            type="button"
            onClick={() => onSave(value.trim())}
            className="btn-primary text-xs"
          >
            {t.reflection.save} <span className="kbd text-on-accent/70">Enter</span>
          </button>
        </div>
      </div>
    </div>
  )
}