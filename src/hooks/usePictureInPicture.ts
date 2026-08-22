import { useCallback, useEffect, useRef, useState } from 'react'

const PIP_WIDTH = 240
const PIP_HEIGHT = 160

export type PipMode = 'document' | 'video' | 'none'

/** Copy all styles (singlefile inlines everything) into the PiP window. */
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
  win.document.documentElement.style.height = '100%'
  win.document.body.style.margin = '0'
  win.document.body.style.minHeight = '100%'
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
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      video.srcObject = null
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

    if (supportsDocumentPip()) {
      try {
        const win = await window.documentPictureInPicture!.requestWindow({
          width: PIP_WIDTH,
          height: PIP_HEIGHT,
        })
        copyStyles(win)
        win.addEventListener('pagehide', () => {
          setPipWindow(null)
          setMode('none')
        })
        setPipWindow(win)
        setMode('document')
        return
      } catch {
        /* document PiP unavailable – fall through to video PiP */
      }
    }

    if (supportsVideoPip()) {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return
      try {
        const stream = canvas.captureStream(10)
        video.srcObject = stream
        video.muted = true
        void video.play().catch(() => {})
        await video.requestPictureInPicture()
        video.addEventListener(
          'leavepictureinpicture',
          () => {
            cleanupVideo()
            setMode('none')
          },
          { once: true },
        )
        setMode('video')
      } catch {
        cleanupVideo()
        setMode('none')
      }
    }
  }, [isSupported, mode, cleanupVideo])

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