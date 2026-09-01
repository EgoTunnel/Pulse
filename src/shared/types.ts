// Core Pulse data model, shared between the main process (local server + file
// storage), the instructor renderer, and the student renderer.

// ---------------------------------------------------------------------------
// Presentations & slides
// ---------------------------------------------------------------------------

export type ContentSlideType = 'title' | 'text' | 'image' | 'imageText' | 'section' | 'blank'

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
  'blank'
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

interface SlideBase {
  id: string
  type: SlideType
  /** Instructor-only speaker notes. Never sent to students. */
  notes?: string
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

// --- Interactive slides ------------------------------------------------------

export interface ChoiceOption {
  id: string
  label: string
}

export interface MultipleChoiceSlide extends SlideBase {
  type: 'multipleChoice'
  question: string
  options: ChoiceOption[]
  correctOptionId?: string
  revealPolicy: RevealPolicy
}

export interface MultipleSelectSlide extends SlideBase {
  type: 'multipleSelect'
  question: string
  options: ChoiceOption[]
  correctOptionIds?: string[]
  revealPolicy: RevealPolicy
}

export interface TrueFalseSlide extends SlideBase {
  type: 'trueFalse'
  question: string
  correctAnswer?: boolean
  revealPolicy: RevealPolicy
}

export interface RatingSlide extends SlideBase {
  type: 'rating'
  question: string
  min: number
  max: number
  minLabel?: string
  maxLabel?: string
  revealPolicy: RevealPolicy
}

export interface LikertSlide extends SlideBase {
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

export interface WordCloudSlide extends SlideBase {
  type: 'wordCloud'
  question: string
  maxWordsPerStudent: number
  revealPolicy: RevealPolicy
}

export interface ShortAnswerSlide extends SlideBase {
  type: 'shortAnswer'
  question: string
  revealPolicy: RevealPolicy
}

export interface OpenResponseSlide extends SlideBase {
  type: 'openResponse'
  question: string
  revealPolicy: RevealPolicy
}

export interface RankingSlide extends SlideBase {
  type: 'ranking'
  question: string
  options: ChoiceOption[]
  revealPolicy: RevealPolicy
}

export interface NumericSlide extends SlideBase {
  type: 'numeric'
  question: string
  unit?: string
  revealPolicy: RevealPolicy
}

export interface QnaSlide extends SlideBase {
  type: 'qna'
  prompt?: string
}

export interface PollSlide extends SlideBase {
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

/** Events the server emits. */
export interface ServerToClientEvents {
  'session:state': (state: SessionStateMessage) => void
  'session:results': (snapshot: ResultsSnapshot) => void
  'session:ended': () => void
  'presenter:error': (message: string) => void
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
    payload: { roomCode: string },
    ack: (result: { ok: true; state: SessionStateMessage } | { ok: false; error: string }) => void
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
  'presenter:endSession': () => void
}
