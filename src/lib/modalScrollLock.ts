let lockCount = 0
let originalOverflow: string | null = null

/**
 * Reference-counted modal body scroll lock.
 * Prevents multiple modals or overlapping transitions from prematurely unlocking
 * or permanently locking document.body overflow.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {}

  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount++

  let released = false
  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow ?? ''
      originalOverflow = null
    }
  }
}
