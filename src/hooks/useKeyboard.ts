import { useEffect, useRef } from 'react'

interface ShortcutHandlers {
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  onFlowFinish?: () => void
}

const isEditableTarget = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null
  if (!node || !node.tagName) return false
  const tag = node.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    node.isContentEditable
  )
}

export function useKeyboard(handlers: ShortcutHandlers): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      const h = handlersRef.current
      if (e.key === ' ') {
        e.preventDefault()
        h.onToggle()
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