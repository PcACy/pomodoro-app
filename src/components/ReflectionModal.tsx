import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../hooks/useTranslation'
import { lockBodyScroll } from '../lib/modalScrollLock'

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
    const unlock = lockBodyScroll()
    return () => {
      unlock()
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
      className={`modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 p-0 backdrop-blur-sm sm:items-start sm:justify-center sm:p-4 sm:pt-[15vh] ${
        closing ? 'modal-backdrop--closing' : ''
      }`}
    >
      <div
        ref={modalRef}
        className={`panel modal-panel w-full max-w-sm rounded-b-none p-5 sm:rounded-card ${closing ? 'modal-panel--closing' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="dot bg-accent" />
            <h3 id="reflection-title" className="label text-fg">
              {t.reflection.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="icon-btn !h-8 !w-8"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-muted">{t.reflection.prompt}</p>
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
          className="input mt-3 min-h-[84px] resize-none font-mono text-xs"
          aria-label={t.reflection.prompt}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="btn-secondary h-10 !px-3.5 !text-[10px]"
            aria-label={`${t.reflection.skip} (Escape)`}
          >
            {t.reflection.skip}
            <kbd className="kbd ml-1">Esc</kbd>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary h-10 !px-4 !text-[10px]"
            aria-label={`${t.reflection.save} (Enter)`}
          >
            {t.reflection.save}
            <kbd className="kbd ml-1 border-canvas/30 bg-transparent">↵</kbd>
          </button>
        </div>
      </div>
    </div>
  )
}