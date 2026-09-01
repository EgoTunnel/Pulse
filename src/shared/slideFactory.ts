import { makeId } from './id'
import type { ChoiceOption, Slide, SlideType } from './types'

function option(label: string): ChoiceOption {
  return { id: makeId(), label }
}

/** Creates a new slide of the given type with sensible, teachable defaults. */
export function createSlide(type: SlideType): Slide {
  const id = makeId()
  switch (type) {
    case 'title':
      return { id, type, title: 'New presentation', subtitle: '' }
    case 'text':
      return { id, type, heading: 'Heading', body: '' }
    case 'image':
      return { id, type, caption: '' }
    case 'imageText':
      return { id, type, heading: 'Heading', body: '', imagePosition: 'right' }
    case 'section':
      return { id, type, title: 'New section' }
    case 'blank':
      return { id, type, heading: '', body: '' }
    case 'multipleChoice':
      return {
        id,
        type,
        question: 'What do you think?',
        options: [option('Option A'), option('Option B'), option('Option C')],
        revealPolicy: 'onReveal'
      }
    case 'multipleSelect':
      return {
        id,
        type,
        question: 'Select all that apply',
        options: [option('Option A'), option('Option B'), option('Option C')],
        revealPolicy: 'onReveal'
      }
    case 'trueFalse':
      return { id, type, question: 'True or false?', revealPolicy: 'onReveal' }
    case 'rating':
      return {
        id,
        type,
        question: 'How confident are you about this concept?',
        min: 1,
        max: 5,
        minLabel: 'Not confident',
        maxLabel: 'Very confident',
        revealPolicy: 'live'
      }
    case 'likert':
      return { id, type, statement: 'This concept makes sense to me.', revealPolicy: 'live' }
    case 'wordCloud':
      return { id, type, question: 'What comes to mind?', maxWordsPerStudent: 2, revealPolicy: 'live' }
    case 'shortAnswer':
      return { id, type, question: 'What is one thing you are taking away from this?', revealPolicy: 'onReveal' }
    case 'openResponse':
      return { id, type, question: 'Share your thoughts.', revealPolicy: 'onReveal' }
    case 'ranking':
      return {
        id,
        type,
        question: 'Rank these from most to least important',
        options: [option('Option A'), option('Option B'), option('Option C')],
        revealPolicy: 'onReveal'
      }
    case 'numeric':
      return { id, type, question: 'What do you predict?', revealPolicy: 'live' }
    case 'qna':
      return { id, type, prompt: 'Ask a question' }
    case 'poll':
      return {
        id,
        type,
        question: 'What do you think?',
        options: [option('Option A'), option('Option B'), option('Option C')],
        revealPolicy: 'live'
      }
  }
}
