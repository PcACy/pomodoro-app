type ChimeKind = 'focus' | 'break'

const SAMPLE_RATE = 44_100

let ctx: AudioContext | null = null
let buffers: Record<ChimeKind, AudioBuffer | null> = { focus: null, break: null }
let initialized = false

function createCtx(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    return new AC()
  } catch {
    return null
  }
}

function ensureCtx(): AudioContext | null {
  if (!ctx) ctx = createCtx()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Render the chime into a reusable AudioBuffer (all notes on one timeline). */
function renderChime(audio: AudioContext, kind: ChimeKind): AudioBuffer | null {
  const notes = kind === 'focus' ? [523.25, 659.25, 783.99] : [659.25, 523.25]
  const step = 0.16
  const duration = 0.6
  const total = step * notes.length + duration + 0.1
  const buf = audio.createBuffer(1, Math.ceil(total * SAMPLE_RATE), SAMPLE_RATE)
  const data = buf.getChannelData(0)

  notes.forEach((freq, i) => {
    const start = i * step
    const startIdx = Math.floor(start * SAMPLE_RATE)
    const len = Math.floor(duration * SAMPLE_RATE)
    for (let j = 0; j < len; j++) {
      const t = j / SAMPLE_RATE
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 4)
      const v = Math.sin(2 * Math.PI * freq * t) * 0.5 + Math.sin(2 * Math.PI * (freq / 2) * t) * 0.3
      data[startIdx + j] = (data[startIdx + j] ?? 0) + v * env * 0.22
    }
  })
  return buf
}

function getBuffer(audio: AudioContext, kind: ChimeKind): AudioBuffer | null {
  const cached = buffers[kind]
  if (cached) return cached
  const rendered = renderChime(audio, kind)
  buffers[kind] = rendered
  return rendered
}

/**
 * Must be called from a user gesture (pointer/keydown/start). Creates and unlocks
 * the AudioContext and pre-renders both chimes into buffers so the phase-end
 * sound plays with zero latency.
 */
export function initAudio(): void {
  const audio = ensureCtx()
  if (!audio || initialized) return
  getBuffer(audio, 'focus')
  getBuffer(audio, 'break')
  initialized = true
}

export function playChime(kind: ChimeKind = 'focus'): void {
  try {
    const audio = ensureCtx()
    if (!audio) return
    const buf = getBuffer(audio, kind)
    if (!buf) return
    const src = audio.createBufferSource()
    src.buffer = buf
    src.connect(audio.destination)
    src.onended = () => {
      try {
        src.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    src.start()
  } catch (err) {
    console.warn('[sound] Failed to play chime:', err)
  }
}