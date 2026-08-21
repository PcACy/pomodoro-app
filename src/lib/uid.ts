export const uid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  }
  throw new Error('Cryptographically secure random number generator is unavailable.')
}

/** Stable, content-derived valid UUID (RFC-4122-style) so identical payloads map to the same id. */
export const uidFrom = (input: string): string => {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  let h3 = 0x67452301
  let h4 = 0xefcdab89
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ ((c << 1) | (c >>> 15)), 0x01000193) >>> 0
    h3 = Math.imul(h3 ^ ((c << 2) | (c >>> 14)), 0x01000193) >>> 0
    h4 = Math.imul(h4 ^ ((c << 3) | (c >>> 13)), 0x01000193) >>> 0
  }
  const hex = (n: number, pad: number): string => n.toString(16).padStart(pad, '0')
  const s1 = hex(h1, 8)
  const s2 = hex(h2, 8)
  const s3 = hex(h3, 8)
  const s4 = hex(h4, 8)
  const p1 = s1
  const p2 = s2.slice(0, 4)
  const p3 = `4${s2.slice(4, 7)}`
  const p4 = `${((parseInt(s3.slice(0, 1), 16) & 0x3) | 0x8).toString(16)}${s3.slice(1, 4)}`
  const p5 = `${s3.slice(4, 8)}${s4}`
  return `${p1}-${p2}-${p3}-${p4}-${p5}`
}