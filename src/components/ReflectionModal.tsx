import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'

interface Props {
  onSave: (notes: string) => void
  onSkip: () => void
}

export function ReflectionModal({ onSave, onSkip }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  /**
   * Plays the inverse exit animation (backdrop fade + panel settle, ~150ms)
   * before unmounting through the parent's save/skip handler. Guarded so
   * double-activations (Enter spam / Escape during close) fire exactly once.
   */
  const requestClose = useCallback((commit: () => void) => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    window.setTimeout(commit, 150)
  }, [])

  const handleSave = useCallback(
    () => requestClose(() => onSave(value.trim())),
    [requestClose, onSave, value],
  )
  const handleSkip = useCallback(() => requestClose(onSkip), [requestClose, onSkip])

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => {
      previousFocusRef.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleSkip()
      } else if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSkip])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reflection-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSkip()
      }}
      className={`modal-backdrop fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4 pt-[15vh] ${
        closing ? 'modal-backdrop--closing' : ''
      }`}
    >
      <div
        ref={modalRef}
        className={`card modal-panel w-full max-w-sm p-5 ${closing ? 'modal-panel--closing' : ''}`}
      >
        <h3 id="reflection-title" className="text-sm font-semibold text-fg">{t.reflection.title}</h3>
        <p className="mt-1 text-xs text-muted">{t.reflection.prompt}</p>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSave()
            }
          }}
          placeholder={t.reflection.placeholder}
          rows={3}
          maxLength={500}
          className="input mt-3 resize-none"
          aria-label={t.reflection.prompt}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="btn-ghost text-xs"
            aria-label={`${t.reflection.skip} (Escape)`}
          >
            {t.reflection.skip} <span className="kbd">Esc</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary text-xs"
            aria-label={`${t.reflection.save} (Enter)`}
          >
            {t.reflection.save} <span className="kbd text-on-accent/70">Enter</span>
          </button>
        </div>
      </div>
    </div>
  )
}