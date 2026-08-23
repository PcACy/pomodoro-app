import { useCallback, useEffect, useRef, useState } from 'react'

const PIP_WIDTH = 260
const PIP_HEIGHT = 180

export type PipMode = 'document' | 'video' | 'none'

/** Copy all styles (singlefile inlines everything) and theme attributes into the PiP window. */
function copyStyles(win: Window): void {
  const dest = win.document.head
  for (const style of Array.from(document.querySelectorAll('style'))) {
    dest.appendChild(style.cloneNode(true))
  }
  for (const link of Array.from(document.querySelectorAll('link[rel="stylesheet"]'))) {
    dest.appendChild(link.cloneNode(true))
  }
  const theme = document.documentElement.getAttribute('data-theme')
  if (theme) win.document.documentElement.setAttribute('data-theme', theme)
  const mode = document.documentElement.getAttribute('data-mode')
  if (mode) win.document.documentElement.setAttribute('data-mode', mode)
  win.document.title = 'Pomau · Timer'
  win.document.documentElement.style.height = '100%'
  win.document.body.style.margin = '0'
  win.document.body.style.height = '100%'
  win.document.body.style.minHeight = '100%'
  win.document.body.style.overflow = 'hidden'
}

const supportsDocumentPip = (): boolean =>
  typeof window !== 'undefined' && 'documentPictureInPicture' in window

const supportsVideoPip = (): boolean =>
  typeof document !== 'undefined' &&
  'pictureInPictureEnabled' in document &&
  'requestPictureInPicture' in HTMLVideoElement.prototype

export interface PictureInPictureState {
  mode: PipMode
  pipWindow: Window | null
  isSupported: boolean
  open: () => Promise<void>
  close: () => void
  canvasRef: React.RefObject<HTMLCanvasElement>
  videoRef: React.RefObject<HTMLVideoElement>
}

export function usePictureInPicture(): PictureInPictureState {
  const [mode, setMode] = useState<PipMode>('none')
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isSupported = supportsDocumentPip() || supportsVideoPip()

  const cleanupVideo = useCallback(() => {
    const video = videoRef.current
    if (video) {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach((t) => t.stop())
        video.srcObject = null
      }
      video.pause()
    }
  }, [])

  const close = useCallback(() => {
    if (pipWindow) {
      try {
        pipWindow.close()
      } catch {
        /* already closed */
      }
    }
    setPipWindow(null)
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => {})
    }
    cleanupVideo()
    setMode('none')
  }, [pipWindow, cleanupVideo])

  const open = useCallback(async () => {
    if (!isSupported || mode !== 'none') return

    // 1. Modern Document Picture-in-Picture API (Chrome/Edge >= 116)
    if (supportsDocumentPip()) {
      try {
        const win = await window.documentPictureInPicture!.requestWindow({
          width: PIP_WIDTH,
          height: PIP_HEIGHT,
        })
        copyStyles(win)
        const handleClose = () => {
          setPipWindow(null)
          setMode('none')
        }
        win.addEventListener('pagehide', handleClose, { once: true })
        win.addEventListener('unload', handleClose, { once: true })
        setPipWindow(win)
        setMode('document')
        return
      } catch (err: unknown) {
        if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
          return
        }
        /* document PiP unavailable – fall through to video PiP */
      }
    }

    // 2. Fallback to HTML5 Canvas + Video Picture-in-Picture (Safari / Firefox / Legacy)
    if (supportsVideoPip()) {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return
      try {
        const captureFn =
          (canvas as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream; mozCaptureStream?: (fps: number) => MediaStream }).captureStream ||
          (canvas as HTMLCanvasElement & { mozCaptureStream?: (fps: number) => MediaStream }).mozCaptureStream
        if (!captureFn) return
        const stream = captureFn.call(canvas, 30)
        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        await video.play()
        await video.requestPictureInPicture()
        const handleLeaveVideo = () => {
          cleanupVideo()
          setMode('none')
        }
        video.addEventListener('leavepictureinpicture', handleLeaveVideo, { once: true })
        setMode('video')
      } catch {
        cleanupVideo()
        setMode('none')
      }
    }
  }, [isSupported, mode, cleanupVideo])

  // Sync theme changes to active document PiP window
  useEffect(() => {
    if (!pipWindow) return
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute('data-theme')
      if (theme) pipWindow.document.documentElement.setAttribute('data-theme', theme)
      const colorMode = document.documentElement.getAttribute('data-mode')
      if (colorMode) pipWindow.document.documentElement.setAttribute('data-mode', colorMode)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] })
    return () => observer.disconnect()
  }, [pipWindow])

  useEffect(() => {
    return () => {
      if (pipWindow) {
        try {
          pipWindow.close()
        } catch {
          /* already closed */
        }
      }
      if (document.pictureInPictureElement) {
        void document.exitPictureInPicture().catch(() => {})
      }
      cleanupVideo()
    }
  }, [pipWindow, cleanupVideo])

  return { mode, pipWindow, isSupported, open, close, canvasRef, videoRef }
}