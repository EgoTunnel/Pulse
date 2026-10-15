// Core Pulse data model, shared between the main process (local server + file
// storage), the instructor renderer, and the student renderer.

import type { PresentationTheme, SlideStyle } from './theme'

// ---------------------------------------------------------------------------
// Presentations & slides
// ---------------------------------------------------------------------------

export type ContentSlideType =
  | 'title'
  | 'text'
  | 'image'
  | 'imageText'
  | 'section'
  | 'blank'
  | 'bullets'
  | 'quote'
  | 'twoColumn'
  | 'statement'
  | 'code'
  | 'timer'
  | 'leaderboard'

export type InteractiveSlideType =
  | 'multipleChoice'
  | 'multipleSelect'
  | 'trueFalse'
  | 'rating'
  | 'likert'
  | 'wordCloud'
  | 'shortAnswer'
  | 'openResponse'
  | 'ranking'
  | 'numeric'
  | 'qna'
  | 'poll'

export type SlideType = ContentSlideType | InteractiveSlideType

export const CONTENT_SLIDE_TYPES: ContentSlideType[] = [
  'title',
  'text',
  'image',
  'imageText',
  'section',
  'blank',
  'bullets',
  'quote',
  'twoColumn',
  'statement',
  'code',
  'timer',
  'leaderboard'
]

export const INTERACTIVE_SLIDE_TYPES: InteractiveSlideType[] = [
  'multipleChoice',
  'multipleSelect',
  'trueFalse',
  'rating',
  'likert',
  'wordCloud',
  'shortAnswer',
  'openResponse',
  'ranking',
  'numeric',
  'qna',
  'poll'
]

export function isInteractiveSlide(slide: Slide): slide is Extract<Slide, { type: InteractiveSlideType }> {
  return (INTERACTIVE_SLIDE_TYPES as string[]).includes(slide.type)
}

export type ScorableSlide = MultipleChoiceSlide | MultipleSelectSlide | TrueFalseSlide

/** Question types that can have a single right answer, and so can be part of a competition. */
export function canBeScored(slide: Slide): slide is ScorableSlide {
  return slide.type === 'multipleChoice' || slide.type === 'multipleSelect' || slide.type === 'trueFalse'
}

/** Marked as scored AND has a correct answer set — a scored question with no answer key can't award points. */
export function isScoredSlide(slide: Slide): slide is ScorableSlide {
  if (!canBeScored(slide) || !slide.scored) return false
  if (slide.type === 'multipleChoice') return !!slide.correctOptionId
  if (slide.type === 'multipleSelect') return !!slide.correctOptionIds && slide.correctOptionIds.length > 0
  return slide.correctAnswer !== undefined
}

export function hasCompetition(presentation: { slides: Slide[] }): boolean {
  return presentation.slides.some(isScoredSlide)
}

interface SlideBase {
  id: string
  type: SlideType
  /** Instructor-only speaker notes. Never sent to students. */
  notes?: string
  /** Per-slide appearance overrides on top of the presentation theme. */
  style?: SlideStyle
}

// --- Content slides ---------------------------------------------------------

export interface TitleSlide extends SlideBase {
  type: 'title'
  title: string
  subtitle?: string
}

export interface TextSlide extends SlideBase {
  type: 'text'
  heading?: string
  body: string
}

export interface ImageSlide extends SlideBase {
  type: 'image'
  imageDataUrl?: string
  caption?: string
  /** Describes the image for screen reader users; falls back to the caption if left blank. */
  altText?: string
}

export interface ImageTextSlide extends SlideBase {
  type: 'imageText'
  heading?: string
  body: string
  imageDataUrl?: string
  imagePosition: 'left' | 'right'
  /** Describes the image for screen reader users. */
  altText?: string
}

export interface SectionSlide extends SlideBase {
  type: 'section'
  title: string
}

export interface BlankSlide extends SlideBase {
  type: 'blank'
  heading?: string
  body?: string
}

export interface BulletsSlide extends SlideBase {
  type: 'bullets'
  heading?: string
  items: string[]
  /** Present mode reveals one bullet per "next" press instead of all at once. */
  revealOneByOne: boolean
}

export interface QuoteSlide extends SlideBase {
  type: 'quote'
  quote: string
  attribution?: string
}

export interface TwoColumnSlide extends SlideBase {
  type: 'twoColumn'
  heading?: string
  leftHeading?: string
  leftBody: string
  rightHeading?: string
  rightBody: string
}

/** A single big number or phrase — "68%", "1 in 4" — with a supporting label. */
export interface StatementSlide extends SlideBase {
  type: 'statement'
  value: string
  label?: string
  description?: string
}

export interface CodeSlide extends SlideBase {
  type: 'code'
  heading?: string
  code: string
  /** Display label only — no syntax highlighting is attempted. */
  language?: string
}

/** A non-polling activity slide — "discuss with your neighbour" — with a visible countdown. */
export interface TimerSlide extends SlideBase {
  type: 'timer'
  heading: string
  body?: string
  durationSeconds: number
}

/** Ranks the competition so far, live — usually dropped in every few quiz questions. */
export interface LeaderboardSlide extends SlideBase {
  type: 'leaderboard'
  heading: string
}

// --- Interactive slides ------------------------------------------------------

interface QuestionBase extends SlideBase {
  /** Responses close automatically after this many seconds. Also drives the speed bonus on scored questions. */
  timeLimitSeconds?: number
}

export interface ChoiceOption {
  id: string
  label: string
}

export interface MultipleChoiceSlide extends QuestionBase {
  type: 'multipleChoice'
  question: string
  options: ChoiceOption[]
  correctOptionId?: string
  revealPolicy: RevealPolicy
  /** Counts toward the competition leaderboard (needs a correct answer). */
  scored?: boolean
}

export interface MultipleSelectSlide extends QuestionBase {
  type: 'multipleSelect'
  question: string
  options: ChoiceOption[]
  correctOptionIds?: string[]
  revealPolicy: RevealPolicy
  /** Counts toward the leaderboard; only an exact match of the correct set scores. */
  scored?: boolean
}

export interface TrueFalseSlide extends QuestionBase {
  type: 'trueFalse'
  question: string
  correctAnswer?: boolean
  revealPolicy: RevealPolicy
  scored?: boolean
}

export interface RatingSlide extends QuestionBase {
  type: 'rating'
  question: string
  min: number
  max: number
  minLabel?: string
  maxLabel?: string
  revealPolicy: RevealPolicy
}

export interface LikertSlide extends QuestionBase {
  type: 'likert'
  statement: string
  revealPolicy: RevealPolicy
}

export const LIKERT_LEVELS = [
  'Strongly disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly agree'
] as const

export interface WordCloudSlide extends QuestionBase {
  type: 'wordCloud'
  question: string
  maxWordsPerStudent: number
  revealPolicy: RevealPolicy
}

export interface ShortAnswerSlide extends QuestionBase {
  type: 'shortAnswer'
  question: string
  revealPolicy: RevealPolicy
}

export interface OpenResponseSlide extends QuestionBase {
  type: 'openResponse'
  question: string
  revealPolicy: RevealPolicy
}

export interface RankingSlide extends QuestionBase {
  type: 'ranking'
  question: string
  options: ChoiceOption[]
  revealPolicy: RevealPolicy
}

export interface NumericSlide extends QuestionBase {
  type: 'numeric'
  question: string
  unit?: string
  revealPolicy: RevealPolicy
}

export interface QnaSlide extends QuestionBase {
  type: 'qna'
  prompt?: string
}

export interface PollSlide extends QuestionBase {
  type: 'poll'
  question: string
  options: ChoiceOption[]
  revealPolicy: RevealPolicy
}

/** Controls whether results are visible to students as they come in, or only after the instructor reveals them. */
export type RevealPolicy = 'live' | 'onReveal'

export type Slide =
  | TitleSlide
  | TextSlide
  | ImageSlide
  | ImageTextSlide
  | SectionSlide
  | BlankSlide
  | BulletsSlide
  | QuoteSlide
  | TwoColumnSlide
  | StatementSlide
  | CodeSlide
  | TimerSlide
  | LeaderboardSlide
  | MultipleChoiceSlide
  | MultipleSelectSlide
  | TrueFalseSlide
  | RatingSlide
  | LikertSlide
  | WordCloudSlide
  | ShortAnswerSlide
  | OpenResponseSlide
  | RankingSlide
  | NumericSlide
  | QnaSlide
  | PollSlide

export interface Presentation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  slides: Slide[]
  /** Optional so presentations saved before themes existed still open (they get the default theme). */
  theme?: PresentationTheme
}

/** Entry in the local library of presentations known to this installation of Pulse. */
export interface LibraryEntry {
  id: string
  title: string
  filePath: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Live sessions
// ---------------------------------------------------------------------------

export type SessionStatus = 'idle' | 'live' | 'ended'

/** Public, non-identifying snapshot of session state broadcast to everyone in the room. */
export interface SessionStateMessage {
  roomCode: string
  status: SessionStatus
  currentSlideId: string | null
  /** The current slide, stripped of speaker notes and correct-answer markers, for student rendering. */
  slide: PublicSlide | null
  responsesOpen: boolean
  resultsRevealed: boolean
  participantCount: number
  responseCount: number
  /** The presentation has scored questions, so players have leaderboard nicknames. */
  competition: boolean
  /** The current slide is a scored question — answers lock on first submit. */
  scored: boolean
  /**
   * Milliseconds until responses auto-close, measured when this message was
   * built. Sent as a duration, not a timestamp, because students' phone
   * clocks can disagree with the instructor's laptop by seconds.
   */
  responsesCloseInMs: number | null
}

export interface LeaderboardEntry {
  nickname: string
  score: number
  /** 1-based; tied scores share a rank. */
  rank: number
}

export interface LeaderboardMessage {
  top: LeaderboardEntry[]
  playerCount: number
}

/** Sent privately to one student — their own standing, never anyone else's. */
export interface StandingMessage {
  nickname: string
  score: number
  rank: number
  playerCount: number
}

/** Sent privately to one student when a scored question's answer is revealed. */
export interface FeedbackMessage {
  slideId: string
  correct: boolean
  points: number
}

/** A slide as seen by students: no speaker notes, no correct-answer markers. */
export type PublicSlide = Slide

export function toPublicSlide(slide: Slide): PublicSlide {
  const clone = { ...slide } as Record<string, unknown>
  delete clone.notes
  delete clone.correctOptionId
  delete clone.correctOptionIds
  delete clone.correctAnswer
  return clone as unknown as PublicSlide
}

// --- Responses ---------------------------------------------------------------

export type ResponseValue =
  | { kind: 'choice'; optionId: string }
  | { kind: 'choices'; optionIds: string[] }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'rating'; value: number }
  | { kind: 'likert'; value: 0 | 1 | 2 | 3 | 4 }
  | { kind: 'words'; words: string[] }
  | { kind: 'text'; text: string }
  | { kind: 'ranking'; optionIds: string[] }
  | { kind: 'numeric'; value: number }
  | { kind: 'question'; text: string }

/** Aggregated, anonymous results for the currently active interactive slide. */
export interface ResultsSnapshot {
  slideId: string
  responseCount: number
  data: ResultsData
}

export type ResultsData =
  | { kind: 'choice'; counts: Record<string, number> }
  | { kind: 'boolean'; counts: { true: number; false: number } }
  | { kind: 'rating'; counts: Record<number, number>; average: number }
  | { kind: 'likert'; counts: Record<number, number> }
  | { kind: 'words'; words: { text: string; count: number }[] }
  | { kind: 'text'; entries: { id: string; text: string }[] }
  | { kind: 'ranking'; averageRank: Record<string, number> }
  | { kind: 'numeric'; values: number[]; average: number; median: number; min: number; max: number }
  | { kind: 'questions'; entries: QnaEntry[] }

export interface QnaEntry {
  id: string
  text: string
  createdAt: string
  addressed: boolean
}

// ---------------------------------------------------------------------------
// Socket.IO event contracts
// ---------------------------------------------------------------------------

/**
 * Whether ANY device has managed to reach this server over the network yet
 * — set the instant a single HTTP request lands on the join route,
 * regardless of whether that device ever successfully joins. Many campus
 * Wi-Fi networks (eduroam and most institutional "Student" SSIDs) enable
 * client/AP isolation, which silently blocks phone-to-laptop connections
 * even though both are on the same network and the QR code looks fine. This
 * is the one reliable signal that distinguishes "the network is blocking
 * this" from "students just haven't scanned yet."
 */
export interface ConnectivitySignal {
  anyDeviceReached: boolean
  firstReachedAt: string | null
}

/** Events the server emits. */
export interface ServerToClientEvents {
  'session:state': (state: SessionStateMessage) => void
  'session:results': (snapshot: ResultsSnapshot) => void
  'session:connectivity': (signal: ConnectivitySignal) => void
  /** Presenter-only. */
  'session:leaderboard': (leaderboard: LeaderboardMessage) => void
  'session:ended': () => void
  'presenter:error': (message: string) => void
  'student:standing': (standing: StandingMessage) => void
  'student:feedback': (feedback: FeedbackMessage) => void
}

// ---------------------------------------------------------------------------
// Auto-update
// ---------------------------------------------------------------------------

export type UpdaterStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }

/** Events clients emit to the server. */
export interface ClientToServerEvents {
  'student:join': (
    /**
     * participantId is random, generated by the student's browser tab and kept
     * in sessionStorage, so a dropped Wi-Fi connection rejoins as the same
     * player (keeping their score and one-vote-per-question) rather than a new
     * one. It's never shown to anyone and dies with the tab.
     */
    payload: { roomCode: string; participantId: string },
    ack: (result: { ok: true; state: SessionStateMessage } | { ok: false; error: string }) => void
  ) => void
  'student:setNickname': (
    payload: { nickname: string },
    ack: (result: { ok: true; nickname: string } | { ok: false; error: string }) => void
  ) => void
  'student:respond': (
    payload: { slideId: string; value: ResponseValue },
    ack: (result: { ok: true } | { ok: false; error: string }) => void
  ) => void
  'presenter:hello': (
    payload: { presenterToken: string },
    ack: (result: { ok: true; state: SessionStateMessage } | { ok: false; error: string }) => void
  ) => void
  'presenter:setSlide': (payload: { slideId: string }) => void
  'presenter:openResponses': () => void
  'presenter:closeResponses': () => void
  'presenter:revealResults': () => void
  'presenter:hideResults': () => void
  'presenter:resetResponses': () => void
  'presenter:dismissQuestion': (payload: { questionId: string }) => void
  'presenter:markQuestionAddressed': (payload: { questionId: string; addressed: boolean }) => void
  /** Removes one student's response to the current slide (short answer / open response) — the presenter's fast override for anything the profanity filter missed. */
  'presenter:removeResponse': (payload: { responseId: string }) => void
  /** Bans a word from the current slide's word cloud, now and for any future submission of it this slide. */
  'presenter:banWord': (payload: { word: string }) => void
  'presenter:endSession': () => void
}
