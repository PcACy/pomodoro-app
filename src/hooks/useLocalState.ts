import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

export function useLocalState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const initialRef = useRef(initial)
  initialRef.current = initial

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      if (raw == null) return initial
      const parsed = JSON.parse(raw) as T
      if (parsed === null && initial !== null) return initial
      return parsed
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      /* storage full / unavailable */
    }
  }, [key, value])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue != null) {
          try {
            const parsed = JSON.parse(e.newValue) as T
            if (parsed === null && initialRef.current !== null) {
              setValue(initialRef.current)
            } else {
              setValue(parsed)
            }
          } catch {
            /* invalid json */
          }
        } else {
          setValue(initialRef.current)
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  return [value, setValue]
}