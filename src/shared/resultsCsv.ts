import type { SavedSession } from './results'
import { LIKERT_LEVELS } from './types'
import type { Slide } from './types'

/**
 * Quotes a CSV field and defuses spreadsheet formula injection: student
 * answers are free text, and a cell starting with = + - @ (or tab/CR) is
 * executed as a formula by Excel/Sheets — e.g. a "response" of
 * =HYPERLINK(...). Prefixing a single quote makes it plain text.
 */
export function csvField(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  let s = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s
}

function questionOf(slide: Slide): string {
  if ('question' in slide) return slide.question
  if ('statement' in slide) return slide.statement
  if ('prompt' in slide) return slide.prompt ?? 'Q&A'
  return ''
}

function pct(count: number, total: number): string {
  return total > 0 ? `${Math.round((count / total) * 100)}%` : ''
}

/** One row per answer option / word / response, with a header block describing the session. */
export function resultsToCsv(session: SavedSession): string {
  const rows: (string | number | undefined)[][] = [
    ['Presentation', session.presentationTitle],
    ['Started', session.startedAt],
    ['Ended', session.endedAt],
    ['Peak participants', session.peakParticipants],
    [],
    ['#', 'Question', 'Type', 'Responses', 'Answer', 'Count', 'Percent', 'Note']
  ]

  session.slides.forEach((r, i) => {
    const n = i + 1
    const q = questionOf(r.slide)
    const base = (answer: string | number, count: number | string, percent = '', note: string | number = ''): (string | number)[] => [
      n, q, r.slideType, r.responseCount, answer, count, percent, note
    ]
    const d = r.data
    switch (d.kind) {
      case 'choice': {
        const options = 'options' in r.slide ? r.slide.options : []
        const correctIds = new Set<string>(
          r.slide.type === 'multipleChoice' && r.slide.correctOptionId
            ? [r.slide.correctOptionId]
            : r.slide.type === 'multipleSelect'
              ? (r.slide.correctOptionIds ?? [])
              : []
        )
        for (const o of options) {
          const count = d.counts[o.id] ?? 0
          rows.push(base(o.label, count, pct(count, r.responseCount), correctIds.has(o.id) ? 'correct answer' : ''))
        }
        break
      }
      case 'boolean': {
        const correct = r.slide.type === 'trueFalse' ? r.slide.correctAnswer : undefined
        rows.push(base('True', d.counts.true, pct(d.counts.true, r.responseCount), correct === true ? 'correct answer' : ''))
        rows.push(base('False', d.counts.false, pct(d.counts.false, r.responseCount), correct === false ? 'correct answer' : ''))
        break
      }
      case 'rating':
        for (const [value, count] of Object.entries(d.counts)) rows.push(base(value, count, pct(count, r.responseCount)))
        rows.push(base('Average', '', '', d.average.toFixed(2)))
        break
      case 'likert':
        LIKERT_LEVELS.forEach((label, level) => {
          const count = d.counts[level] ?? 0
          rows.push(base(label, count, pct(count, r.responseCount)))
        })
        break
      case 'words':
        for (const w of d.words) rows.push(base(w.text, w.count))
        break
      case 'text':
        for (const e of d.entries) rows.push(base(e.text, 1))
        break
      case 'ranking': {
        const options = 'options' in r.slide ? r.slide.options : []
        for (const o of options) rows.push(base(o.label, '', '', `average rank ${(d.averageRank[o.id] ?? 0).toFixed(2)}`))
        break
      }
      case 'numeric':
        rows.push(base('Average', '', '', d.average.toFixed(2)))
        rows.push(base('Median', '', '', d.median.toFixed(2)))
        rows.push(base('Min', '', '', d.min))
        rows.push(base('Max', '', '', d.max))
        for (const v of d.values) rows.push(base(v, 1))
        break
      case 'questions':
        for (const e of d.entries) rows.push(base(e.text, 1, '', e.addressed ? 'addressed' : ''))
        break
    }
    if (r.scored) {
      rows.push(base('Scored question: answered correctly', r.scored.correct, pct(r.scored.correct, r.scored.answered)))
    }
  })

  // BOM so Excel opens UTF-8 (accents, emoji in answers) correctly.
  return '﻿' + rows.map((row) => row.map((v) => csvField(v)).join(',')).join('\r\n') + '\r\n'
}
