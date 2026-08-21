import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

export function useLocalState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const initialRef = useRef(initial)
  initialRef.current = initial

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full / unavailable */
    }
  }, [key, value])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue != null) {
          try {
            setValue(JSON.parse(e.newValue) as T)
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