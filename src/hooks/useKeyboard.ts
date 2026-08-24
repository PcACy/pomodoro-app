import { useEffect, useRef } from 'react'

interface ShortcutHandlers {
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  onFlowFinish?: () => void
  onToggleZen?: () => void
  onExitZen?: () => void
}

const isEditableTarget = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null
  if (!node || !node.tagName) return false
  const tag = node.tagName.toUpperCase()
  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    node.isContentEditable
  ) {
    return true
  }
  if (typeof node.closest === 'function') {
    if (
      node.closest(
        'input, textarea, select, button, [contenteditable="true"], [role="textbox"], [role="combobox"], [role="searchbox"], [role="menuitem"], [role="option"]',
      )
    ) {
      return true
    }
  }
  return false
}

export function useKeyboard(handlers: ShortcutHandlers): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      // Never hijack browser/OS shortcuts (Ctrl/Cmd+R reload, Cmd+Z undo, …)
      // and ignore auto-repeat so holding a key does not toggle rapidly.
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const h = handlersRef.current
      if (e.key === ' ') {
        e.preventDefault()
        h.onToggle()
      } else if (e.key.toLowerCase() === 'z' && h.onToggleZen) {
        e.preventDefault()
        h.onToggleZen()
      } else if (e.key === 'Escape' && h.onExitZen) {
        e.preventDefault()
        h.onExitZen()
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