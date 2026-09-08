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
  const timerRef = useRef<number | null>(null)

  /**
   * Plays the inverse exit animation (backdrop fade + panel settle, ~150ms)
   * before unmounting through the parent's save/skip handler. Guarded so
   * double-activations (Enter spam / Escape during close) fire exactly once.
   */
  const requestClose = useCallback((commit: () => void) => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    timerRef.current = window.setTimeout(commit, 150)
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
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
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
      className={`modal-backdrop fixed inset-0 z-40 flex items-start justify-center bg-black/80 p-4 pt-[15vh] ${
        closing ? 'modal-backdrop--closing' : ''
      }`}
    >
      <div
        ref={modalRef}
        className={`card modal-panel w-full max-w-sm border border-line bg-surface p-5 ${closing ? 'modal-panel--closing' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <h3 id="reflection-title" className="font-mono text-xs font-bold uppercase tracking-widest text-fg">
              {t.reflection.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="font-mono text-xs text-muted transition-colors hover:text-fg"
            aria-label="Close"
          >
            [ X ]
          </button>
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted leading-relaxed">{t.reflection.prompt}</p>
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
          className="mt-3 w-full resize-none rounded-lg border border-line bg-canvas p-3 font-mono text-xs text-fg placeholder:text-muted focus:border-fg focus:outline-none"
          aria-label={t.reflection.prompt}
        />
        <div className="mt-3.5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="btn-ghost rounded-full px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider"
            aria-label={`${t.reflection.skip} (Escape)`}
          >
            {t.reflection.skip} <span className="ml-1 rounded border border-line px-1 py-0.5 font-mono text-[10px] text-muted">Esc</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wider"
            aria-label={`${t.reflection.save} (Enter)`}
          >
            {t.reflection.save} <span className="ml-1 rounded border border-canvas/40 px-1 py-0.5 font-mono text-[10px] text-canvas/80">Enter</span>
          </button>
        </div>
      </div>
    </div>
  )
}