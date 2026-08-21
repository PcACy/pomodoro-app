import { useEffect, useRef } from 'react'

interface MediaSessionOptions {
  isRunning: boolean
  formattedTime: string
  modeTitle: string
  activeTask?: string
  activeTag?: string
  onPlay?: () => void
  onPause?: () => void
  onSkip?: () => void
  onReset?: () => void
}

// 1-second PCM silent WAV data URI for holding browser MPRIS audio pipeline active on Linux
const SILENT_WAV_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

export function useMediaSession({
  isRunning,
  formattedTime,
  modeTitle,
  activeTask,
  activeTag,
  onPlay,
  onPause,
  onSkip,
  onReset,
}: MediaSessionOptions) {
  const silentAudioRef = useRef<HTMLAudioElement | null>(null)
  const handlersRef = useRef({ onPlay, onPause, onSkip, onReset })

  useEffect(() => {
    handlersRef.current = { onPlay, onPause, onSkip, onReset }
  }, [onPlay, onPause, onSkip, onReset])

  // Initialize background silent audio element for DBus / MPRIS bridge
  useEffect(() => {
    if (typeof window === 'undefined') return

    const audio = new Audio(SILENT_WAV_URI)
    audio.loop = true
    audio.preload = 'auto'
    silentAudioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      silentAudioRef.current = null
    }
  }, [])

  // Play / pause silent loop matching timer state to keep MPRIS bus active
  useEffect(() => {
    const audio = silentAudioRef.current
    if (!audio) return

    if (isRunning) {
      void audio.play().catch(() => {
        /* Autoplay policy might block until first user interaction */
      })
    } else {
      audio.pause()
    }
  }, [isRunning])

  // Register MediaSession action handlers (Desktop MPRIS & keyboard media keys)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    const ms = navigator.mediaSession
    const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        /* Action not supported by browser */
      }
    }

    safeSetHandler('play', () => handlersRef.current.onPlay?.())
    safeSetHandler('pause', () => handlersRef.current.onPause?.())
    safeSetHandler('nexttrack', () => handlersRef.current.onSkip?.())
    safeSetHandler('previoustrack', () => handlersRef.current.onReset?.())
    safeSetHandler('stop', () => handlersRef.current.onSkip?.())

    return () => {
      safeSetHandler('play', null)
      safeSetHandler('pause', null)
      safeSetHandler('nexttrack', null)
      safeSetHandler('previoustrack', null)
      safeSetHandler('stop', null)
    }
  }, [])

  // Update MediaSession metadata & playbackState dynamically
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    try {
      const ms = navigator.mediaSession
      const title = `${formattedTime} · ${modeTitle}`
      const artist = `Pomau${activeTask ? ` · ${activeTask}` : ''}`
      const album = activeTag || 'General'

      ms.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      })

      ms.playbackState = isRunning ? 'playing' : 'paused'
    } catch {
      /* mediaSession metadata update failed */
    }
  }, [formattedTime, modeTitle, activeTask, activeTag, isRunning])
}
