// Runtime validation for anything arriving over the network. TypeScript's
// ClientToServerEvents types are a contract for OUR OWN client code — they
// give zero protection against a raw socket.io connection (or any device on
// the LAN) sending arbitrary, malformed, or hostile payloads. Every field
// used below is treated as `unknown` until proven otherwise, because an
// uncaught exception in a socket handler can crash the whole app for the
// entire class.
import type { ResponseValue, Slide } from '@shared/types'

const MAX_TEXT_LENGTH = 3000
const MAX_WORD_LENGTH = 60
const MAX_WORDS = 10
const MAX_ROOM_CODE_LENGTH = 16
const MAX_ID_LENGTH = 200

export function isString(v: unknown): v is string {
  return typeof v === 'string'
}

export function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean'
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isBoundedString(v: unknown, maxLength: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= maxLength
}

export function validRoomCode(v: unknown): string | null {
  return isBoundedString(v, MAX_ROOM_CODE_LENGTH) ? v : null
}

export function validId(v: unknown): string | null {
  return isBoundedString(v, MAX_ID_LENGTH) ? v : null
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * Validates an incoming response payload against the slide it's supposedly
 * answering, cross-checking `kind` matches the slide type and every field
 * is the right shape, bounded size, and (where applicable) references an
 * option that actually exists on the slide. Returns null to reject.
 */
export function validateResponseValue(slide: Slide, raw: unknown): ResponseValue | null {
  if (!isPlainObject(raw) || !isString(raw.kind)) return null

  switch (slide.type) {
    case 'multipleChoice':
    case 'poll': {
      if (raw.kind !== 'choice' || !isString(raw.optionId)) return null
      if (!slide.options.some((o) => o.id === raw.optionId)) return null
      return { kind: 'choice', optionId: raw.optionId }
    }
    case 'multipleSelect': {
      if (raw.kind !== 'choices' || !Array.isArray(raw.optionIds)) return null
      const validIds = new Set(slide.options.map((o) => o.id))
      const optionIds = [...new Set(raw.optionIds.filter(isString))].filter((id) => validIds.has(id))
      if (optionIds.length === 0 || optionIds.length > slide.options.length) return null
      return { kind: 'choices', optionIds }
    }
    case 'trueFalse': {
      if (raw.kind !== 'boolean' || !isBoolean(raw.value)) return null
      return { kind: 'boolean', value: raw.value }
    }
    case 'rating': {
      if (raw.kind !== 'rating' || !isFiniteNumber(raw.value)) return null
      const value = Math.round(raw.value)
      if (value < slide.min || value > slide.max) return null
      return { kind: 'rating', value }
    }
    case 'likert': {
      if (raw.kind !== 'likert' || !isFiniteNumber(raw.value)) return null
      if (![0, 1, 2, 3, 4].includes(raw.value)) return null
      return { kind: 'likert', value: raw.value as 0 | 1 | 2 | 3 | 4 }
    }
    case 'wordCloud': {
      if (raw.kind !== 'words' || !Array.isArray(raw.words)) return null
      const words = raw.words
        .filter(isString)
        .map((w) => w.trim().slice(0, MAX_WORD_LENGTH))
        .filter((w) => w.length > 0)
        .slice(0, Math.min(slide.maxWordsPerStudent || MAX_WORDS, MAX_WORDS))
      if (words.length === 0) return null
      return { kind: 'words', words }
    }
    case 'shortAnswer':
    case 'openResponse': {
      if (raw.kind !== 'text' || !isString(raw.text)) return null
      const text = raw.text.trim().slice(0, MAX_TEXT_LENGTH)
      if (text.length === 0) return null
      return { kind: 'text', text }
    }
    case 'ranking': {
      if (raw.kind !== 'ranking' || !Array.isArray(raw.optionIds)) return null
      const expected = slide.options.map((o) => o.id)
      const submitted = raw.optionIds.filter(isString)
      const sameSet = expected.length === submitted.length && expected.every((id) => submitted.includes(id))
      if (!sameSet) return null
      return { kind: 'ranking', optionIds: submitted }
    }
    case 'numeric': {
      if (raw.kind !== 'numeric' || !isFiniteNumber(raw.value)) return null
      if (Math.abs(raw.value) > 1e9) return null
      return { kind: 'numeric', value: raw.value }
    }
    case 'qna': {
      if (raw.kind !== 'question' || !isString(raw.text)) return null
      const text = raw.text.trim().slice(0, 500)
      if (text.length === 0) return null
      return { kind: 'question', text }
    }
    default:
      return null
  }
}
