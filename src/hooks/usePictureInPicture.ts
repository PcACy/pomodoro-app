import { useCallback, useEffect, useState } from 'react'

const PIP_WIDTH = 240
const PIP_HEIGHT = 160

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
  win.document.documentElement.style.height = '100%'
  win.document.body.style.margin = '0'
  win.document.body.style.minHeight = '100%'
}

export interface PictureInPictureState {
  pipWindow: Window | null
  isSupported: boolean
  open: () => Promise<void>
  close: () => void
}

export function usePictureInPicture(): PictureInPictureState {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const isSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window

  const open = useCallback(async () => {
    if (!isSupported || pipWindow) return
    try {
      const win = await window.documentPictureInPicture!.requestWindow({
        width: PIP_WIDTH,
        height: PIP_HEIGHT,
      })
      copyStyles(win)
      win.addEventListener('pagehide', () => setPipWindow(null))
      setPipWindow(win)
    } catch {
      setPipWindow(null)
    }
  }, [isSupported, pipWindow])

  const close = useCallback(() => {
    if (pipWindow) pipWindow.close()
    setPipWindow(null)
  }, [pipWindow])

  useEffect(() => {
    return () => {
      if (pipWindow) pipWindow.close()
    }
  }, [pipWindow])

  return { pipWindow, isSupported, open, close }
}