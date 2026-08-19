let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  audio: AudioContext,
  freq: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
): void {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, audio.currentTime + start)
  gain.gain.setValueAtTime(0, audio.currentTime + start)
  gain.gain.linearRampToValueAtTime(volume, audio.currentTime + start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(audio.currentTime + start)
  osc.stop(audio.currentTime + start + duration + 0.05)
}

/** Pleasant rising chime used when a phase ends. */
export function playChime(kind: 'focus' | 'break' = 'focus'): void {
  const audio = getCtx()
  if (!audio) return
  const notes = kind === 'focus' ? [523.25, 659.25, 783.99] : [659.25, 523.25]
  notes.forEach((freq, i) => {
    tone(audio, freq, i * 0.16, 0.6, 0.16, 'sine')
    tone(audio, freq / 2, i * 0.16, 0.6, 0.08, 'triangle')
  })
}