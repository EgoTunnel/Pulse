import { randomUUID } from 'node:crypto'
import { makeRoomCode } from '@shared/id'
import type {
  FeedbackMessage,
  LeaderboardMessage,
  Presentation,
  QnaEntry,
  ResponseValue,
  ResultsData,
  ResultsSnapshot,
  ScorableSlide,
  SessionStateMessage,
  SessionStatus,
  Slide,
  StandingMessage
} from '@shared/types'
import { hasCompetition, isInteractiveSlide, isScoredSlide, toPublicSlide } from '@shared/types'
import { MAX_NICKNAME_LENGTH, randomNickname } from '@shared/nicknames'
import { validateResponseValue } from './validate'
import { isProfane } from './moderation'

/** Hard ceiling on Q&A submissions kept per slide, regardless of maxWordsPerStudent-style client hints. */
const MAX_QNA_ENTRIES_PER_SLIDE = 500
const LEADERBOARD_SIZE = 10
/** Points for a correct answer with no time limit, and the most a timed one can earn. */
const MAX_POINTS = 1000
/** A correct-but-last-second answer on a timed question still earns this much. */
const MIN_TIMED_POINTS = 500

interface StoredResponse {
  participantId: string
  value: ResponseValue
  createdAt: number
}

interface ScoreRecord {
  correct: boolean
  points: number
}

/**
 * Owns the state of one live classroom session. Everything here is
 * in-memory only and is discarded when the session ends — including
 * leaderboard nicknames. Pulse only persists aggregate, anonymous results,
 * and only when the instructor explicitly chooses to save them.
 */
export class SessionManager {
  readonly presentation: Presentation
  readonly roomCode: string
  readonly presenterToken: string
  readonly startedAt = new Date().toISOString()
  readonly competition: boolean

  private status: SessionStatus = 'live'
  private currentSlideId: string | null
  private responsesOpen = false
  private resultsRevealed = false
  /** When responses (re)opened on the current slide — the clock for time limits and speed bonuses. */
  private openedAt = Date.now()
  /** socketId -> participantId. A participant can briefly have two sockets while reconnecting. */
  private sockets = new Map<string, string>()
  private peakParticipants = 0
  private nicknames = new Map<string, string>()
  /** slideId -> participantId -> response (latest wins; scored questions lock on first answer). */
  private responses = new Map<string, Map<string, StoredResponse>>()
  /** slideId -> accumulated Q&A submissions (students may ask more than one question). */
  private qnaEntries = new Map<string, QnaEntry[]>()
  /** slideId -> words the presenter has manually banned from that slide's word cloud (case-insensitive, matched post-normalization). */
  private bannedWords = new Map<string, Set<string>>()
  /** slideId -> participantId -> score. Held back from totals until the answer is revealed (see commitScores). */
  private scores = new Map<string, Map<string, ScoreRecord>>()
  private committedSlides = new Set<string>()

  constructor(presentation: Presentation) {
    this.presentation = presentation
    this.roomCode = makeRoomCode()
    this.presenterToken = randomUUID()
    this.currentSlideId = presentation.slides[0]?.id ?? null
    this.competition = hasCompetition(presentation)
  }

  private currentSlide(): Slide | undefined {
    return this.presentation.slides.find((s) => s.id === this.currentSlideId)
  }

  private isRevealPolicyLive(slide: Slide | undefined): boolean {
    if (!slide) return true
    // A scored question's results would show which option is correct the
    // moment the first vote lands — never live, whatever the setting says.
    if (isScoredSlide(slide)) return false
    return 'revealPolicy' in slide ? slide.revealPolicy === 'live' : true
  }

  private timeLimitMs(slide: Slide | undefined): number | null {
    if (!slide || !isInteractiveSlide(slide) || !slide.timeLimitSeconds) return null
    return slide.timeLimitSeconds * 1000
  }

  /** Milliseconds until the current slide's responses auto-close, or null if there's no running time limit. */
  msUntilClose(): number | null {
    const limit = this.timeLimitMs(this.currentSlide())
    if (limit === null || !this.responsesOpen) return null
    return Math.max(0, this.openedAt + limit - Date.now())
  }

  private connectedParticipantIds(): Set<string> {
    return new Set(this.sockets.values())
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
      participantCount: this.connectedParticipantIds().size,
      responseCount: this.currentSlideId ? this.responseCountFor(this.currentSlideId) : 0,
      competition: this.competition,
      scored: !!slide && isScoredSlide(slide),
      responsesCloseInMs: this.msUntilClose()
    }
  }

  private responseCountFor(slideId: string): number {
    const slide = this.presentation.slides.find((s) => s.id === slideId)
    if (slide?.type === 'qna') return this.qnaEntries.get(slideId)?.length ?? 0
    return this.responses.get(slideId)?.size ?? 0
  }

  /** In competition mode, a first-time participant is auto-assigned a random nickname so they're on the leaderboard with zero extra steps. */
  addParticipant(socketId: string, participantId: string): void {
    this.sockets.set(socketId, participantId)
    if (this.competition && !this.nicknames.has(participantId)) {
      this.nicknames.set(participantId, this.uniqueNickname(randomNickname()))
    }
    this.peakParticipants = Math.max(this.peakParticipants, this.connectedParticipantIds().size)
  }

  removeParticipant(socketId: string): void {
    // Their nickname and score stay — they may just be reconnecting.
    this.sockets.delete(socketId)
  }

  participantFor(socketId: string): string | undefined {
    return this.sockets.get(socketId)
  }

  socketsFor(participantId: string): string[] {
    return [...this.sockets.entries()].filter(([, p]) => p === participantId).map(([s]) => s)
  }

  private uniqueNickname(base: string, ownerId?: string): string {
    const taken = (name: string): boolean =>
      [...this.nicknames.entries()].some(([id, n]) => id !== ownerId && n.toLowerCase() === name.toLowerCase())
    if (!taken(base)) return base
    for (let i = 2; ; i++) {
      const candidate = `${base.slice(0, MAX_NICKNAME_LENGTH - String(i).length - 1)} ${i}`
      if (!taken(candidate)) return candidate
    }
  }

  setNickname(participantId: string, raw: unknown): { ok: true; nickname: string } | { ok: false; error: string } {
    if (!this.competition) return { ok: false, error: 'There is no competition in this session.' }
    if (typeof raw !== 'string') return { ok: false, error: 'Please enter a nickname.' }
    // Collapse whitespace and strip control characters before length checks.
    const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
    if (cleaned.length < 2) return { ok: false, error: 'Nicknames need at least 2 characters.' }
    if (cleaned.length > MAX_NICKNAME_LENGTH) return { ok: false, error: `Nicknames can be at most ${MAX_NICKNAME_LENGTH} characters.` }
    if (isProfane(cleaned)) return { ok: false, error: 'Please pick a classroom-appropriate nickname.' }
    const nickname = this.uniqueNickname(cleaned, participantId)
    this.nicknames.set(participantId, nickname)
    return { ok: true, nickname }
  }

  /**
   * Moves to a slide. Returns feedback for the slide being left if it was a
   * scored question whose answer was never revealed — moving on counts as
   * the reveal, so nobody's points are silently lost.
   */
  setSlide(slideId: string): { changed: boolean; feedback: Map<string, FeedbackMessage> } {
    const exists = this.presentation.slides.some((s) => s.id === slideId)
    if (!exists) return { changed: false, feedback: new Map() }
    const feedback = this.currentSlideId && this.currentSlideId !== slideId ? this.commitScores(this.currentSlideId) : new Map()
    this.currentSlideId = slideId
    // Each interactive slide starts open for responses so instructors don't
    // need an extra click for the common case; they can still close early.
    this.responsesOpen = true
    this.resultsRevealed = false
    this.openedAt = Date.now()
    return { changed: true, feedback }
  }

  openResponses(): void {
    this.responsesOpen = true
    // Reopening restarts any time limit from the full duration.
    this.openedAt = Date.now()
  }

  closeResponses(): void {
    this.responsesOpen = false
  }

  revealResults(): Map<string, FeedbackMessage> {
    this.resultsRevealed = true
    // Revealing a scored question puts the right answer on the projector —
    // anyone who hadn't answered yet could just copy it. Close it.
    const slide = this.currentSlide()
    if (slide && isScoredSlide(slide)) this.responsesOpen = false
    return this.currentSlideId ? this.commitScores(this.currentSlideId) : new Map()
  }

  hideResults(): void {
    this.resultsRevealed = false
  }

  resetResponses(): void {
    if (!this.currentSlideId) return
    this.responses.delete(this.currentSlideId)
    this.qnaEntries.delete(this.currentSlideId)
    this.bannedWords.delete(this.currentSlideId)
    this.scores.delete(this.currentSlideId)
    this.committedSlides.delete(this.currentSlideId)
    this.openedAt = Date.now()
  }

  /** Removes one student's response to the current slide — the presenter's fast override for anything a filter missed. `responseId` is the participant id it was stored under. */
  removeResponse(responseId: string): void {
    if (!this.currentSlideId) return
    this.responses.get(this.currentSlideId)?.delete(responseId)
  }

  /** Bans a word from the current slide's word cloud — strips it from the tally now and any future submission of it. */
  banWord(word: string): void {
    if (!this.currentSlideId) return
    const normalized = word.trim().toLowerCase()
    if (!normalized) return
    const set = this.bannedWords.get(this.currentSlideId) ?? new Set<string>()
    set.add(normalized)
    this.bannedWords.set(this.currentSlideId, set)
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
    this.sockets.clear()
    this.nicknames.clear()
    this.responses.clear()
    this.qnaEntries.clear()
    this.scores.clear()
    this.committedSlides.clear()
  }

  /** `rawValue` is untrusted network input — never assume it matches the ResponseValue shape until validateResponseValue says so. */
  recordResponse(participantId: string, slideId: unknown, rawValue: unknown): { ok: true } | { ok: false; error: string } {
    if (this.status !== 'live') return { ok: false, error: 'This session has ended.' }
    if (typeof slideId !== 'string' || slideId !== this.currentSlideId) {
      return { ok: false, error: 'That question is no longer active.' }
    }
    // msUntilClose() === 0 catches a submission that lands a few ms after the
    // limit, before the server's close timer has fired.
    if (!this.responsesOpen || this.msUntilClose() === 0) return { ok: false, error: 'Responses are closed for this question.' }

    const slide = this.currentSlide()
    if (!slide) return { ok: false, error: 'That question is no longer active.' }

    const scored = isScoredSlide(slide)
    if (scored && this.responses.get(slideId)?.has(participantId)) {
      return { ok: false, error: 'Your answer is already locked in.' }
    }

    const validated = validateResponseValue(slide, rawValue)
    if (!validated.ok) {
      return {
        ok: false,
        error:
          validated.reason === 'blocked'
            ? 'Please keep responses appropriate for the classroom.'
            : 'That response is not valid for this question.'
      }
    }
    const value = validated.value

    if (value.kind === 'question') {
      const list = this.qnaEntries.get(slideId) ?? []
      if (list.length >= MAX_QNA_ENTRIES_PER_SLIDE) return { ok: false, error: 'This question queue is full.' }
      list.push({ id: randomUUID(), text: value.text, createdAt: new Date().toISOString(), addressed: false })
      this.qnaEntries.set(slideId, list)
      return { ok: true }
    }

    const bySlide = this.responses.get(slideId) ?? new Map<string, StoredResponse>()
    bySlide.set(participantId, { participantId, value, createdAt: Date.now() })
    this.responses.set(slideId, bySlide)

    if (scored) {
      const correct = isCorrect(slide, value)
      const limit = this.timeLimitMs(slide)
      let points = 0
      if (correct) {
        // Speed bonus only exists on timed questions: answering instantly is
        // worth the full amount, at the buzzer half of it.
        points = limit === null ? MAX_POINTS : Math.round(MAX_POINTS - (MAX_POINTS - MIN_TIMED_POINTS) * Math.min(1, (Date.now() - this.openedAt) / limit))
      }
      const slideScores = this.scores.get(slideId) ?? new Map<string, ScoreRecord>()
      slideScores.set(participantId, { correct, points })
      this.scores.set(slideId, slideScores)
    }
    return { ok: true }
  }

  /** Adds a scored slide's points to the running totals (once) and returns each answerer's private feedback. */
  private commitScores(slideId: string): Map<string, FeedbackMessage> {
    const out = new Map<string, FeedbackMessage>()
    const slideScores = this.scores.get(slideId)
    if (!slideScores || this.committedSlides.has(slideId)) return out
    this.committedSlides.add(slideId)
    for (const [participantId, record] of slideScores) {
      out.set(participantId, { slideId, correct: record.correct, points: record.points })
    }
    return out
  }

  private totals(): Map<string, number> {
    const totals = new Map<string, number>()
    for (const id of this.nicknames.keys()) totals.set(id, 0)
    for (const slideId of this.committedSlides) {
      for (const [id, record] of this.scores.get(slideId) ?? []) totals.set(id, (totals.get(id) ?? 0) + record.points)
    }
    return totals
  }

  private ranked(): { participantId: string; nickname: string; score: number; rank: number }[] {
    const rows = [...this.totals().entries()]
      .map(([participantId, score]) => ({ participantId, nickname: this.nicknames.get(participantId) ?? 'Player', score }))
      .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))
    let rank = 0
    let prevScore: number | null = null
    return rows.map((row, i) => {
      if (row.score !== prevScore) rank = i + 1
      prevScore = row.score
      return { ...row, rank }
    })
  }

  getLeaderboard(): LeaderboardMessage {
    const ranked = this.ranked()
    return {
      top: ranked.slice(0, LEADERBOARD_SIZE).map(({ nickname, score, rank }) => ({ nickname, score, rank })),
      playerCount: ranked.length
    }
  }

  getStanding(participantId: string): StandingMessage | null {
    if (!this.competition) return null
    const ranked = this.ranked()
    const me = ranked.find((r) => r.participantId === participantId)
    if (!me) return null
    return { nickname: me.nickname, score: me.score, rank: me.rank, playerCount: ranked.length }
  }

  getResultsSnapshot(): ResultsSnapshot | null {
    return this.currentSlideId ? this.getResultsFor(this.currentSlideId) : null
  }

  getResultsFor(slideId: string): ResultsSnapshot | null {
    const slide = this.presentation.slides.find((s) => s.id === slideId)
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
    const banned = this.bannedWords.get(slide.id) ?? new Set<string>()
    const data = computeResultsData(slide, stored, banned)
    if (!data) return null
    return { slideId: slide.id, responseCount: stored.length, data }
  }

  /** Session-wide facts for a saved results record — counts only, nothing about any individual. */
  getSummary(): { startedAt: string; peakParticipants: number; playerCount: number } {
    return { startedAt: this.startedAt, peakParticipants: this.peakParticipants, playerCount: this.nicknames.size }
  }

  /** Per-question accuracy for a saved results record — aggregate only. */
  getScoredStats(slideId: string): { answered: number; correct: number } | null {
    const slideScores = this.scores.get(slideId)
    if (!slideScores) return null
    let correct = 0
    for (const r of slideScores.values()) if (r.correct) correct += 1
    return { answered: slideScores.size, correct }
  }
}

function isCorrect(slide: ScorableSlide, value: ResponseValue): boolean {
  if (slide.type === 'multipleChoice') return value.kind === 'choice' && value.optionId === slide.correctOptionId
  if (slide.type === 'trueFalse') return value.kind === 'boolean' && value.value === slide.correctAnswer
  if (value.kind !== 'choices') return false
  const expected = new Set(slide.correctOptionIds ?? [])
  return value.optionIds.length === expected.size && value.optionIds.every((id) => expected.has(id))
}

function computeResultsData(slide: Slide, stored: StoredResponse[], bannedWords: Set<string>): ResultsData | null {
  const values = stored.map((s) => s.value)
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
          if (!word || bannedWords.has(word)) continue
          tally.set(word, (tally.get(word) ?? 0) + 1)
        }
      }
      const words = [...tally.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count)
      return { kind: 'words', words }
    }
    case 'shortAnswer':
    case 'openResponse': {
      const entries = stored
        .filter((s): s is StoredResponse & { value: { kind: 'text'; text: string } } => s.value.kind === 'text')
        .map((s) => ({ id: s.participantId, text: s.value.text }))
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
