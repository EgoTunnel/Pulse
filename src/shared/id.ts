import { customAlphabet, nanoid } from 'nanoid'

/** IDs for persisted objects (presentations, slides, options). */
export function makeId(): string {
  return nanoid(12)
}

const roomCodeAlphabet = '0123456789'
const roomCodeGenerator = customAlphabet(roomCodeAlphabet, 6)

/** Short numeric room code students type in, or that's embedded in the QR join URL. */
export function makeRoomCode(): string {
  const raw = roomCodeGenerator()
  return `${raw.slice(0, 3)} ${raw.slice(3)}`
}

export function normalizeRoomCode(code: string): string {
  return code.replace(/\s+/g, '')
}
