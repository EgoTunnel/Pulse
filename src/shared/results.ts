// Saved session results — what an instructor can choose to keep after a
// class. Deliberately aggregate and anonymous: counts, word tallies, and
// the text of free responses (which students wrote anonymously), but no
// participant ids, socket ids, or leaderboard nicknames. Stored as separate
// files, never inside the .pulse.json presentation, so sharing a
// presentation with a colleague never shares a class's answers.

import type { ResultsData, Slide, SlideType } from './types'

export interface SavedSlideResult {
  slideId: string
  slideType: SlideType
  /** The slide as it was presented (minus speaker notes), so results stay readable even after the presentation is edited. */
  slide: Slide
  responseCount: number
  data: ResultsData
  /** Scored questions only: how many answered and how many got it right. */
  scored?: { answered: number; correct: number }
}

export interface SavedSession {
  /** Format marker so a stray JSON file isn't mistaken for results. */
  kind: 'pulse-results'
  version: 1
  id: string
  presentationId: string
  presentationTitle: string
  startedAt: string
  endedAt: string
  peakParticipants: number
  /** Competition sessions only — a count, never the nicknames. */
  playerCount?: number
  slides: SavedSlideResult[]
}

export interface SavedSessionSummary {
  id: string
  presentationId: string
  presentationTitle: string
  startedAt: string
  endedAt: string
  peakParticipants: number
  questionCount: number
  playerCount?: number
}

export function summarize(s: SavedSession): SavedSessionSummary {
  return {
    id: s.id,
    presentationId: s.presentationId,
    presentationTitle: s.presentationTitle,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    peakParticipants: s.peakParticipants,
    questionCount: s.slides.length,
    playerCount: s.playerCount
  }
}
