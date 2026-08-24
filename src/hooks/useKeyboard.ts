import { useEffect, useRef } from 'react'

interface ShortcutHandlers {
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  onFlowFinish?: () => void
  onToggleZen?: () => void
  onExitZen?: () => void
}

const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], [role="searchbox"], [role="combobox"]'

// Interactive controls keep their native Space activation (click). Global
// shortcuts must not steal it — but letter and Escape keys never trigger a
// native action on them, so those remain safe to intercept while focused.
const ACTIVATABLE_SELECTOR =
  'button, a[href], summary, [role="button"], [role="menuitem"], [role="option"], [role="tab"]'

const isTextEntryTarget = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null
  if (!node) return false
  if (node.isContentEditable) return true
  const tag = node.tagName?.toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return typeof node.closest === 'function' && node.closest(TEXT_ENTRY_SELECTOR) !== null
}

const isActivatableTarget = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null
  return !!node && typeof node.closest === 'function' && node.closest(ACTIVATABLE_SELECTOR) !== null
}

export function useKeyboard(handlers: ShortcutHandlers): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never hijack typing inside form fields or rich-text editors.
      if (isTextEntryTarget(e.target)) return
      // Never hijack browser/OS shortcuts (Ctrl/Cmd+R reload, Cmd+Z undo, …)
      // and ignore auto-repeat so holding a key does not toggle rapidly.
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const h = handlersRef.current
      if (e.key === ' ') {
        // A focused button/link/tab keeps its native click-on-Space instead.
        if (isActivatableTarget(e.target)) return
        e.preventDefault()
        h.onToggle()
      } else if (e.key === 'Escape' && h.onExitZen) {
        e.preventDefault()
        h.onExitZen()
      } else if (e.key.toLowerCase() === 'z' && h.onToggleZen) {
        e.preventDefault()
        h.onToggleZen()
      } else if (e.key.toLowerCase() === 'f' && h.onFlowFinish) {
        e.preventDefault()
        h.onFlowFinish()
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        h.onSkip()
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        h.onReset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
