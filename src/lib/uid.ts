export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/** Stable, content-derived UUID (RFC-4122-style) so identical payloads map to the same id. */
export const uidFrom = (input: string): string => {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ (c << 1 | c >>> 15), 0x01000193) >>> 0
  }
  const hex = (n: number, pad: number): string => n.toString(16).padStart(pad, '0')
  const s1 = hex(h1, 8)
  const s2 = hex(h2, 8)
  return `${s1.slice(0, 8)}-${s1.slice(8, 12)}-4${s1.slice(12, 15)}-8${s2.slice(1, 4)}-${s2.slice(4, 16)}`
}