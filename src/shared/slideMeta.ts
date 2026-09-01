import type { SlideType } from './types'

export interface SlideTypeMeta {
  type: SlideType
  label: string
  description: string
  glyph: string
}

export const CONTENT_SLIDE_META: SlideTypeMeta[] = [
  { type: 'title', label: 'Title', description: 'A title and subtitle', glyph: 'T' },
  { type: 'text', label: 'Text', description: 'Heading and body text', glyph: '¶' },
  { type: 'image', label: 'Image', description: 'A full image with caption', glyph: '▧' },
  { type: 'imageText', label: 'Image + Text', description: 'Image beside text', glyph: '▥' },
  { type: 'section', label: 'Section', description: 'A section divider', glyph: '§' },
  { type: 'blank', label: 'Blank', description: 'Start from scratch', glyph: '▢' }
]

export const INTERACTIVE_SLIDE_META: SlideTypeMeta[] = [
  { type: 'multipleChoice', label: 'Multiple Choice', description: 'Students pick one answer', glyph: '◉' },
  { type: 'multipleSelect', label: 'Multiple Select', description: 'Students pick several answers', glyph: '☑' },
  { type: 'trueFalse', label: 'True / False', description: 'A quick binary check', glyph: '⇄' },
  { type: 'rating', label: 'Rating / Scale', description: 'Respond along a numeric scale', glyph: '▁▄█' },
  { type: 'likert', label: 'Likert Scale', description: 'Agreement with a statement', glyph: '↔' },
  { type: 'wordCloud', label: 'Word Cloud', description: 'Short words form a live cloud', glyph: '☁' },
  { type: 'shortAnswer', label: 'Short Answer', description: 'A brief written response', glyph: '✎' },
  { type: 'openResponse', label: 'Open Response', description: 'A longer written response', glyph: '✍' },
  { type: 'ranking', label: 'Ranking', description: 'Students rank a set of options', glyph: '≡' },
  { type: 'numeric', label: 'Numeric Response', description: 'Students answer with a number', glyph: '#' },
  { type: 'qna', label: 'Q&A', description: 'Students submit live questions', glyph: '?' },
  { type: 'poll', label: 'Poll', description: 'General-purpose quick poll', glyph: '▤' }
]

export const ALL_SLIDE_META = [...CONTENT_SLIDE_META, ...INTERACTIVE_SLIDE_META]

export function slideMetaFor(type: SlideType): SlideTypeMeta {
  const meta = ALL_SLIDE_META.find((m) => m.type === type)
  if (!meta) throw new Error(`Unknown slide type: ${type}`)
  return meta
}

export interface SlideTemplate {
  id: string
  name: string
  example: string
  type: SlideType
}

/** Named templates from the vision doc's "Interactive Slide Templates" section — shortcuts that pre-fill a question. */
export const SLIDE_TEMPLATES: SlideTemplate[] = [
  { id: 'quick-poll', name: 'Quick Poll', example: 'What do you think?', type: 'poll' },
  { id: 'knowledge-check', name: 'Knowledge Check', example: 'Which answer is correct?', type: 'multipleChoice' },
  { id: 'prediction', name: 'Prediction', example: 'What do you think will happen?', type: 'numeric' },
  { id: 'opinion', name: 'Opinion', example: 'How strongly do you agree?', type: 'likert' },
  { id: 'brainstorm', name: 'Brainstorm', example: 'What comes to mind when you hear...?', type: 'wordCloud' },
  { id: 'reflection', name: 'Reflection', example: 'What is one thing you are taking away from this?', type: 'shortAnswer' },
  { id: 'confidence-check', name: 'Confidence Check', example: 'How confident are you about this topic?', type: 'rating' },
  { id: 'discussion-starter', name: 'Discussion Starter', example: 'Choose the statement that best represents your view.', type: 'multipleChoice' }
]
