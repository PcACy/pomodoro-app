import { useEffect } from 'react'

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

export function useKeyboard({ onToggle, onSkip, onReset, onFlowFinish }: ShortcutHandlers): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.key === ' ') {
        e.preventDefault()
        onToggle()
      } else if (e.key.toLowerCase() === 'f' && onFlowFinish) {
        e.preventDefault()
        onFlowFinish()
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        onSkip()
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        onReset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggle, onSkip, onReset, onFlowFinish])
}