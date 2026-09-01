import type { Slide } from '@shared/types'
import { isInteractiveSlide } from '@shared/types'

interface Props {
  slide: Slide
  size: 'preview' | 'present'
}

/** Renders the static content of a slide — title, prompt, image — with no results or response UI. */
export function SlideStatic({ slide, size }: Props): JSX.Element {
  const big = size === 'present'

  if (isInteractiveSlide(slide)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
        <span className={big ? 'text-sm uppercase tracking-widest text-pulse-300' : 'text-[10px] uppercase tracking-widest text-pulse-400'}>
          {questionKindLabel(slide.type)}
        </span>
        <h2 className={big ? 'max-w-4xl text-5xl font-semibold text-white' : 'max-w-md text-base font-semibold text-white'}>
          {questionText(slide)}
        </h2>
      </div>
    )
  }

  switch (slide.type) {
    case 'title':
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
          <h1 className={big ? 'text-6xl font-bold text-white' : 'text-xl font-bold text-white'}>{slide.title || 'Untitled'}</h1>
          {slide.subtitle && <p className={big ? 'text-2xl text-slate-300' : 'text-sm text-slate-300'}>{slide.subtitle}</p>}
        </div>
      )
    case 'text':
      return (
        <div className={`flex h-full w-full flex-col justify-center gap-3 ${big ? 'px-24' : 'px-6'}`}>
          {slide.heading && <h2 className={big ? 'text-4xl font-semibold text-white' : 'text-lg font-semibold text-white'}>{slide.heading}</h2>}
          <p className={big ? 'whitespace-pre-wrap text-2xl leading-relaxed text-slate-200' : 'whitespace-pre-wrap text-sm text-slate-300'}>
            {slide.body || 'Empty text slide'}
          </p>
        </div>
      )
    case 'image':
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
          {slide.imageDataUrl ? (
            <img
              src={slide.imageDataUrl}
              alt={slide.altText || slide.caption || ''}
              className="max-h-[80%] max-w-full rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-700 text-slate-500">
              No image
            </div>
          )}
          {slide.caption && <p className={big ? 'text-lg text-slate-300' : 'text-xs text-slate-400'}>{slide.caption}</p>}
        </div>
      )
    case 'imageText':
      return (
        <div className={`flex h-full w-full items-center gap-6 ${big ? 'px-16' : 'px-4'} ${slide.imagePosition === 'left' ? '' : 'flex-row-reverse'}`}>
          <div className="flex h-full flex-1 items-center justify-center">
            {slide.imageDataUrl ? (
              <img src={slide.imageDataUrl} alt={slide.altText || ''} className="max-h-[70%] max-w-full rounded-lg object-contain" />
            ) : (
              <div className="flex h-2/3 w-full items-center justify-center rounded-lg border border-dashed border-slate-700 text-slate-500">
                No image
              </div>
            )}
          </div>
          <div className="flex-1">
            {slide.heading && <h2 className={big ? 'mb-3 text-3xl font-semibold text-white' : 'mb-1 text-base font-semibold text-white'}>{slide.heading}</h2>}
            <p className={big ? 'whitespace-pre-wrap text-xl text-slate-200' : 'whitespace-pre-wrap text-xs text-slate-300'}>{slide.body}</p>
          </div>
        </div>
      )
    case 'section':
      return (
        <div className="flex h-full w-full items-center justify-center bg-pulse-600/20">
          <h2 className={big ? 'text-5xl font-bold text-white' : 'text-xl font-bold text-white'}>{slide.title || 'Section'}</h2>
        </div>
      )
    case 'blank':
      return (
        <div className={`flex h-full w-full flex-col justify-center gap-2 ${big ? 'px-24' : 'px-6'}`}>
          {slide.heading && <h2 className={big ? 'text-4xl font-semibold text-white' : 'text-base font-semibold text-white'}>{slide.heading}</h2>}
          {slide.body && <p className={big ? 'whitespace-pre-wrap text-2xl text-slate-200' : 'whitespace-pre-wrap text-xs text-slate-300'}>{slide.body}</p>}
        </div>
      )
  }
}

function questionKindLabel(type: Slide['type']): string {
  switch (type) {
    case 'multipleChoice':
      return 'Multiple Choice'
    case 'multipleSelect':
      return 'Multiple Select'
    case 'trueFalse':
      return 'True or False'
    case 'rating':
      return 'Rating'
    case 'likert':
      return 'Likert Scale'
    case 'wordCloud':
      return 'Word Cloud'
    case 'shortAnswer':
      return 'Short Answer'
    case 'openResponse':
      return 'Open Response'
    case 'ranking':
      return 'Ranking'
    case 'numeric':
      return 'Numeric Response'
    case 'qna':
      return 'Q&A'
    case 'poll':
      return 'Poll'
    default:
      return ''
  }
}

export function questionText(slide: Slide): string {
  switch (slide.type) {
    case 'multipleChoice':
    case 'multipleSelect':
    case 'wordCloud':
    case 'shortAnswer':
    case 'openResponse':
    case 'ranking':
    case 'numeric':
    case 'poll':
    case 'trueFalse':
    case 'rating':
      return slide.question
    case 'likert':
      return slide.statement
    case 'qna':
      return slide.prompt || 'Ask a question'
    default:
      return ''
  }
}
