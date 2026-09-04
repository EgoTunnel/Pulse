// Runtime validation for anything arriving over the network. TypeScript's
// ClientToServerEvents types are a contract for OUR OWN client code — they
// give zero protection against a raw socket.io connection (or any device on
// the LAN) sending arbitrary, malformed, or hostile payloads. Every field
// used below is treated as `unknown` until proven otherwise, because an
// uncaught exception in a socket handler can crash the whole app for the
// entire class.
import type { ResponseValue, Slide } from '@shared/types'
import { isProfane } from './moderation'

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

export type ValidationResult =
  | { ok: true; value: ResponseValue }
  | { ok: false; reason: 'invalid' | 'blocked' }

const invalid: ValidationResult = { ok: false, reason: 'invalid' }
const blocked: ValidationResult = { ok: false, reason: 'blocked' }
function ok(value: ResponseValue): ValidationResult {
  return { ok: true, value }
}

/**
 * Validates an incoming response payload against the slide it's supposedly
 * answering, cross-checking `kind` matches the slide type and every field
 * is the right shape, bounded size, and (where applicable) references an
 * option that actually exists on the slide. Free-text fields (word cloud,
 * short/open answer, Q&A) are also screened for profanity — this is a
 * broadcast surface (the response can appear on the projector in front of
 * the whole class), so it gets the same "safe by default" treatment as the
 * rest of this file, on top of the presenter's own fast manual removal
 * controls once something is showing.
 */
export function validateResponseValue(slide: Slide, raw: unknown): ValidationResult {
  if (!isPlainObject(raw) || !isString(raw.kind)) return invalid

  switch (slide.type) {
    case 'multipleChoice':
    case 'poll': {
      if (raw.kind !== 'choice' || !isString(raw.optionId)) return invalid
      if (!slide.options.some((o) => o.id === raw.optionId)) return invalid
      return ok({ kind: 'choice', optionId: raw.optionId })
    }
    case 'multipleSelect': {
      if (raw.kind !== 'choices' || !Array.isArray(raw.optionIds)) return invalid
      const validIds = new Set(slide.options.map((o) => o.id))
      const optionIds = [...new Set(raw.optionIds.filter(isString))].filter((id) => validIds.has(id))
      if (optionIds.length === 0 || optionIds.length > slide.options.length) return invalid
      return ok({ kind: 'choices', optionIds })
    }
    case 'trueFalse': {
      if (raw.kind !== 'boolean' || !isBoolean(raw.value)) return invalid
      return ok({ kind: 'boolean', value: raw.value })
    }
    case 'rating': {
      if (raw.kind !== 'rating' || !isFiniteNumber(raw.value)) return invalid
      const value = Math.round(raw.value)
      if (value < slide.min || value > slide.max) return invalid
      return ok({ kind: 'rating', value })
    }
    case 'likert': {
      if (raw.kind !== 'likert' || !isFiniteNumber(raw.value)) return invalid
      if (![0, 1, 2, 3, 4].includes(raw.value)) return invalid
      return ok({ kind: 'likert', value: raw.value as 0 | 1 | 2 | 3 | 4 })
    }
    case 'wordCloud': {
      if (raw.kind !== 'words' || !Array.isArray(raw.words)) return invalid
      const words = raw.words
        .filter(isString)
        .map((w) => w.trim().slice(0, MAX_WORD_LENGTH))
        .filter((w) => w.length > 0)
        .slice(0, Math.min(slide.maxWordsPerStudent || MAX_WORDS, MAX_WORDS))
      // Drop individual profane words rather than rejecting the whole
      // submission — a student who sends ["excited", "slur"] still gets
      // "excited" counted, and the bad word never reaches the tally.
      const clean = words.filter((w) => !isProfane(w))
      if (words.length > 0 && clean.length === 0) return blocked
      if (clean.length === 0) return invalid
      return ok({ kind: 'words', words: clean })
    }
    case 'shortAnswer':
    case 'openResponse': {
      if (raw.kind !== 'text' || !isString(raw.text)) return invalid
      const text = raw.text.trim().slice(0, MAX_TEXT_LENGTH)
      if (text.length === 0) return invalid
      if (isProfane(text)) return blocked
      return ok({ kind: 'text', text })
    }
    case 'ranking': {
      if (raw.kind !== 'ranking' || !Array.isArray(raw.optionIds)) return invalid
      const expected = slide.options.map((o) => o.id)
      const submitted = raw.optionIds.filter(isString)
      const sameSet = expected.length === submitted.length && expected.every((id) => submitted.includes(id))
      if (!sameSet) return invalid
      return ok({ kind: 'ranking', optionIds: submitted })
    }
    case 'numeric': {
      if (raw.kind !== 'numeric' || !isFiniteNumber(raw.value)) return invalid
      if (Math.abs(raw.value) > 1e9) return invalid
      return ok({ kind: 'numeric', value: raw.value })
    }
    case 'qna': {
      if (raw.kind !== 'question' || !isString(raw.text)) return invalid
      const text = raw.text.trim().slice(0, 500)
      if (text.length === 0) return invalid
      if (isProfane(text)) return blocked
      return ok({ kind: 'question', text })
    }
    default:
      return invalid
  }
}
