import { randomUUID } from 'node:crypto'
import { makeRoomCode } from '@shared/id'
import type {
  Presentation,
  QnaEntry,
  ResponseValue,
  ResultsData,
  ResultsSnapshot,
  SessionStateMessage,
  SessionStatus,
  Slide
} from '@shared/types'
import { toPublicSlide } from '@shared/types'
import { validateResponseValue } from './validate'

/** Hard ceiling on Q&A submissions kept per slide, regardless of maxWordsPerStudent-style client hints. */
const MAX_QNA_ENTRIES_PER_SLIDE = 500

interface StoredResponse {
  socketId: string
  value: ResponseValue
  createdAt: number
}

/**
 * Owns the state of one live classroom session. Everything here is
 * in-memory only and is discarded when the session ends — Pulse never
 * persists student participation unless the instructor explicitly exports
 * a results snapshot from the presentation file.
 */
export class SessionManager {
  readonly presentation: Presentation
  readonly roomCode: string
  readonly presenterToken: string

  private status: SessionStatus = 'live'
  private currentSlideId: string | null
  private responsesOpen = false
  private resultsRevealed = false
  private participants = new Set<string>()
  /** slideId -> socketId -> response (latest submission wins, one per student per slide). */
  private responses = new Map<string, Map<string, StoredResponse>>()
  /** slideId -> accumulated Q&A submissions (students may ask more than one question). */
  private qnaEntries = new Map<string, QnaEntry[]>()

  constructor(presentation: Presentation) {
    this.presentation = presentation
    this.roomCode = makeRoomCode()
    this.presenterToken = randomUUID()
    this.currentSlideId = presentation.slides[0]?.id ?? null
  }

  private currentSlide(): Slide | undefined {
    return this.presentation.slides.find((s) => s.id === this.currentSlideId)
  }

  private isRevealPolicyLive(slide: Slide | undefined): boolean {
    if (!slide) return true
    return 'revealPolicy' in slide ? slide.revealPolicy === 'live' : true
  }

  getState(): SessionStateMessage {
    const slide = this.currentSlide()
    return {
      roomCode: this.roomCode,
      status: this.status,
      currentSlideId: this.currentSlideId,
      slide: slide ? toPublicSlide(slide) : null,
      responsesOpen: this.responsesOpen,
      resultsRevealed: this.resultsRevealed || this.isRevealPolicyLive(slide),
      participantCount: this.participants.size,
      responseCount: this.currentSlideId ? this.responses.get(this.currentSlideId)?.size ?? 0 : 0
    }
  }

  addParticipant(socketId: string): void {
    this.participants.add(socketId)
  }

  removeParticipant(socketId: string): void {
    this.participants.delete(socketId)
  }

  setSlide(slideId: string): boolean {
    const exists = this.presentation.slides.some((s) => s.id === slideId)
    if (!exists) return false
    this.currentSlideId = slideId
    // Each interactive slide starts open for responses so instructors don't
    // need an extra click for the common case; they can still close early.
    this.responsesOpen = true
    this.resultsRevealed = false
    return true
  }

  openResponses(): void {
    this.responsesOpen = true
  }

  closeResponses(): void {
    this.responsesOpen = false
  }

  revealResults(): void {
    this.resultsRevealed = true
  }

  hideResults(): void {
    this.resultsRevealed = false
  }

  resetResponses(): void {
    if (!this.currentSlideId) return
    this.responses.delete(this.currentSlideId)
    this.qnaEntries.delete(this.currentSlideId)
  }

  dismissQuestion(questionId: string): void {
    if (!this.currentSlideId) return
    const list = this.qnaEntries.get(this.currentSlideId)
    if (!list) return
    this.qnaEntries.set(this.currentSlideId, list.filter((q) => q.id !== questionId))
  }

  markQuestionAddressed(questionId: string, addressed: boolean): void {
    if (!this.currentSlideId) return
    const list = this.qnaEntries.get(this.currentSlideId)
    if (!list) return
    this.qnaEntries.set(
      this.currentSlideId,
      list.map((q) => (q.id === questionId ? { ...q, addressed } : q))
    )
  }

  end(): void {
    this.status = 'ended'
    this.participants.clear()
    this.responses.clear()
    this.qnaEntries.clear()
  }

  /** `rawValue` is untrusted network input — never assume it matches the ResponseValue shape until validateResponseValue says so. */
  recordResponse(socketId: string, slideId: unknown, rawValue: unknown): { ok: true } | { ok: false; error: string } {
    if (this.status !== 'live') return { ok: false, error: 'This session has ended.' }
    if (typeof slideId !== 'string' || slideId !== this.currentSlideId) {
      return { ok: false, error: 'That question is no longer active.' }
    }
    if (!this.responsesOpen) return { ok: false, error: 'Responses are closed for this question.' }

    const slide = this.currentSlide()
    if (!slide) return { ok: false, error: 'That question is no longer active.' }

    const value = validateResponseValue(slide, rawValue)
    if (!value) return { ok: false, error: 'That response is not valid for this question.' }

    if (value.kind === 'question') {
      const list = this.qnaEntries.get(slideId) ?? []
      if (list.length >= MAX_QNA_ENTRIES_PER_SLIDE) return { ok: false, error: 'This question queue is full.' }
      list.push({ id: randomUUID(), text: value.text, createdAt: new Date().toISOString(), addressed: false })
      this.qnaEntries.set(slideId, list)
      return { ok: true }
    }

    const bySlide = this.responses.get(slideId) ?? new Map<string, StoredResponse>()
    bySlide.set(socketId, { socketId, value, createdAt: Date.now() })
    this.responses.set(slideId, bySlide)
    return { ok: true }
  }

  getResultsSnapshot(): ResultsSnapshot | null {
    const slide = this.currentSlide()
    if (!slide) return null

    if (slide.type === 'qna') {
      const entries = this.qnaEntries.get(slide.id) ?? []
      return {
        slideId: slide.id,
        responseCount: entries.length,
        data: { kind: 'questions', entries }
      }
    }

    const stored = [...(this.responses.get(slide.id)?.values() ?? [])]
    const values = stored.map((s) => s.value)
    const data = computeResultsData(slide, values)
    if (!data) return null
    return { slideId: slide.id, responseCount: values.length, data }
  }
}

function computeResultsData(slide: Slide, values: ResponseValue[]): ResultsData | null {
  switch (slide.type) {
    case 'multipleChoice':
    case 'poll': {
      const counts: Record<string, number> = {}
      for (const opt of slide.options) counts[opt.id] = 0
      for (const v of values) if (v.kind === 'choice') counts[v.optionId] = (counts[v.optionId] ?? 0) + 1
      return { kind: 'choice', counts }
    }
    case 'multipleSelect': {
      const counts: Record<string, number> = {}
      for (const opt of slide.options) counts[opt.id] = 0
      for (const v of values) if (v.kind === 'choices') for (const id of v.optionIds) counts[id] = (counts[id] ?? 0) + 1
      return { kind: 'choice', counts }
    }
    case 'trueFalse': {
      const counts = { true: 0, false: 0 }
      for (const v of values) if (v.kind === 'boolean') counts[v.value ? 'true' : 'false'] += 1
      return { kind: 'boolean', counts }
    }
    case 'rating': {
      const counts: Record<number, number> = {}
      for (let n = slide.min; n <= slide.max; n++) counts[n] = 0
      let sum = 0
      let n = 0
      for (const v of values) {
        if (v.kind !== 'rating') continue
        counts[v.value] = (counts[v.value] ?? 0) + 1
        sum += v.value
        n += 1
      }
      return { kind: 'rating', counts, average: n > 0 ? sum / n : 0 }
    }
    case 'likert': {
      const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
      for (const v of values) if (v.kind === 'likert') counts[v.value] += 1
      return { kind: 'likert', counts }
    }
    case 'wordCloud': {
      const tally = new Map<string, number>()
      for (const v of values) {
        if (v.kind !== 'words') continue
        for (const raw of v.words) {
          const word = raw.trim().toLowerCase().slice(0, 40)
          if (!word) continue
          tally.set(word, (tally.get(word) ?? 0) + 1)
        }
      }
      const words = [...tally.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count)
      return { kind: 'words', words }
    }
    case 'shortAnswer':
    case 'openResponse': {
      const entries = values.filter((v) => v.kind === 'text').map((v, i) => ({ id: String(i), text: (v as { text: string }).text }))
      return { kind: 'text', entries }
    }
    case 'ranking': {
      const totals: Record<string, number> = {}
      const counts: Record<string, number> = {}
      for (const opt of slide.options) {
        totals[opt.id] = 0
        counts[opt.id] = 0
      }
      for (const v of values) {
        if (v.kind !== 'ranking') continue
        v.optionIds.forEach((id, index) => {
          totals[id] = (totals[id] ?? 0) + (index + 1)
          counts[id] = (counts[id] ?? 0) + 1
        })
      }
      const averageRank: Record<string, number> = {}
      for (const opt of slide.options) averageRank[opt.id] = counts[opt.id] > 0 ? totals[opt.id] / counts[opt.id] : 0
      return { kind: 'ranking', averageRank }
    }
    case 'numeric': {
      const nums = values.filter((v) => v.kind === 'numeric').map((v) => (v as { value: number }).value)
      const sorted = [...nums].sort((a, b) => a - b)
      const sum = nums.reduce((a, b) => a + b, 0)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length === 0 ? 0 : sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
      return {
        kind: 'numeric',
        values: nums,
        average: nums.length > 0 ? sum / nums.length : 0,
        median,
        min: sorted.length > 0 ? sorted[0] : 0,
        max: sorted.length > 0 ? sorted[sorted.length - 1] : 0
      }
    }
    default:
      return null
  }
}
