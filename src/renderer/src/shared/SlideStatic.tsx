import type { LeaderboardMessage, Slide } from '@shared/types'
import { isInteractiveSlide, isScoredSlide } from '@shared/types'
import { fontStack } from '@shared/theme'
import { LeaderboardView } from './LeaderboardView'

interface Props {
  slide: Slide
  /** Present mode only: how many bullets are showing on a reveal-one-by-one bullet slide. */
  visibleBullets?: number
  /** Present mode only: live seconds remaining on an activity-timer slide. */
  timerRemaining?: number
  /** Present mode only: live standings for a leaderboard slide (the editor shows a sample). */
  leaderboard?: LeaderboardMessage | null
}

/** The editor stores bullet text line-by-line as typed; blank lines aren't bullets. */
export function bulletItems(items: string[]): string[] {
  return items.filter((i) => i.trim().length > 0)
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Renders the static content of a slide — no results or response UI. All
 * colors and fonts come from the slide-* theme tokens, so this must sit
 * inside an element styled with themeStyleVars() (see SlideThumbnail /
 * PresentMode).
 */
export function SlideStatic({ slide, visibleBullets, timerRemaining, leaderboard }: Props): JSX.Element {
  const left = slide.style?.align === 'left'
  const alignClass = left ? 'items-start text-left' : 'items-center text-center'

  if (isInteractiveSlide(slide)) {
    return (
      <div className={`flex h-full w-full flex-col justify-center gap-4 px-16 text-slide-fg ${alignClass}`}>
        <span className="slide-small font-semibold uppercase tracking-widest text-slide-accent">
          {questionKindLabel(slide.type)}
          {isScoredSlide(slide) && ' · Scored'}
        </span>
        <h2 className="slide-h2 max-w-4xl">{questionText(slide)}</h2>
      </div>
    )
  }

  switch (slide.type) {
    case 'title':
      return (
        <div className={`flex h-full w-full flex-col justify-center gap-4 px-16 text-slide-fg ${alignClass}`}>
          <h1 className="slide-h1">{slide.title || 'Untitled'}</h1>
          {slide.subtitle && <p className="slide-body text-slide-muted">{slide.subtitle}</p>}
        </div>
      )
    case 'text':
      return (
        <div className={`flex h-full w-full flex-col justify-center gap-4 px-20 text-slide-fg ${alignClass}`}>
          {slide.heading && <h2 className="slide-h2">{slide.heading}</h2>}
          <p className="slide-body whitespace-pre-wrap text-slide-muted">{slide.body || 'Empty text slide'}</p>
        </div>
      )
    case 'image':
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-slide-fg">
          {slide.imageDataUrl ? (
            <img
              src={slide.imageDataUrl}
              alt={slide.altText || slide.caption || ''}
              className="max-h-[80%] max-w-full rounded-lg object-contain"
            />
          ) : (
            <Placeholder />
          )}
          {slide.caption && <p className="slide-small text-slide-muted">{slide.caption}</p>}
        </div>
      )
    case 'imageText':
      return (
        <div
          className={`flex h-full w-full items-center gap-10 px-16 text-left text-slide-fg ${
            slide.imagePosition === 'left' ? '' : 'flex-row-reverse'
          }`}
        >
          <div className="flex h-full flex-1 items-center justify-center">
            {slide.imageDataUrl ? (
              <img src={slide.imageDataUrl} alt={slide.altText || ''} className="max-h-[70%] max-w-full rounded-lg object-contain" />
            ) : (
              <Placeholder short />
            )}
          </div>
          <div className="flex-1">
            {slide.heading && <h2 className="slide-h3 mb-3">{slide.heading}</h2>}
            <p className="slide-body whitespace-pre-wrap text-slide-muted">{slide.body}</p>
          </div>
        </div>
      )
    case 'section':
      return (
        <div className={`flex h-full w-full flex-col justify-center px-16 text-slide-fg ${alignClass}`}>
          <div className="mb-6 h-1.5 w-24 rounded-full bg-slide-accent" aria-hidden="true" />
          <h2 className="slide-h1">{slide.title || 'Section'}</h2>
        </div>
      )
    case 'blank':
      return (
        <div className={`flex h-full w-full flex-col justify-center gap-3 px-20 text-slide-fg ${alignClass}`}>
          {slide.heading && <h2 className="slide-h2">{slide.heading}</h2>}
          {slide.body && <p className="slide-body whitespace-pre-wrap text-slide-muted">{slide.body}</p>}
        </div>
      )
    case 'bullets': {
      const items = bulletItems(slide.items)
      const shown = visibleBullets ?? items.length
      return (
        <div className="flex h-full w-full flex-col justify-center gap-6 px-20 text-left text-slide-fg">
          {slide.heading && <h2 className={`slide-h2 ${left ? '' : 'text-center'}`}>{slide.heading}</h2>}
          <ul className="space-y-4">
            {items.map((item, i) => (
              <li
                key={i}
                aria-hidden={i >= shown}
                className={`slide-body flex items-baseline gap-4 transition-opacity duration-300 ${i < shown ? 'opacity-100' : 'opacity-0'}`}
              >
                <span className="inline-block h-3 w-3 shrink-0 translate-y-[-0.15em] rounded-full bg-slide-accent" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    }
    case 'quote':
      return (
        <figure className={`flex h-full w-full flex-col justify-center gap-6 px-24 text-slide-fg ${alignClass}`}>
          <span className="slide-display leading-none text-slide-accent" aria-hidden="true">
            “
          </span>
          <blockquote className="slide-h2 -mt-10 italic">{slide.quote || 'Your quote here'}</blockquote>
          {slide.attribution && <figcaption className="slide-body text-slide-muted">— {slide.attribution}</figcaption>}
        </figure>
      )
    case 'twoColumn':
      return (
        <div className="flex h-full w-full flex-col justify-center gap-8 px-16 text-left text-slide-fg">
          {slide.heading && <h2 className={`slide-h2 ${left ? '' : 'text-center'}`}>{slide.heading}</h2>}
          <div className="grid grid-cols-2 gap-10">
            {[
              { heading: slide.leftHeading, body: slide.leftBody },
              { heading: slide.rightHeading, body: slide.rightBody }
            ].map((col, i) => (
              <div key={i} className="rounded-2xl bg-slide-fg/5 p-6">
                {col.heading && <h3 className="slide-h3 mb-3 text-slide-accent">{col.heading}</h3>}
                <p className="slide-body whitespace-pre-wrap text-slide-muted">{col.body}</p>
              </div>
            ))}
          </div>
        </div>
      )
    case 'statement':
      return (
        <div className={`flex h-full w-full flex-col justify-center gap-3 px-20 text-slide-fg ${alignClass}`}>
          <p className="slide-display text-slide-accent" style={{ fontSize: 'calc(8rem * var(--slide-scale, 1))' }}>
            {slide.value || '—'}
          </p>
          {slide.label && <p className="slide-h3">{slide.label}</p>}
          {slide.description && <p className="slide-body max-w-3xl text-slide-muted">{slide.description}</p>}
        </div>
      )
    case 'code':
      return (
        <div className="flex h-full w-full flex-col justify-center gap-4 px-16 text-left text-slide-fg">
          <div className="flex items-baseline justify-between">
            {slide.heading && <h2 className="slide-h3">{slide.heading}</h2>}
            {slide.language && <span className="slide-small uppercase tracking-widest text-slide-accent">{slide.language}</span>}
          </div>
          <pre
            className="overflow-hidden rounded-xl bg-black/40 p-6 text-slate-100"
            style={{ fontFamily: fontStack('mono'), fontSize: 'calc(1.25rem * var(--slide-scale, 1))', lineHeight: 1.5 }}
          >
            <code>{slide.code}</code>
          </pre>
        </div>
      )
    case 'leaderboard':
      return <LeaderboardView heading={slide.heading} data={leaderboard} />
    case 'timer': {
      const remaining = timerRemaining ?? slide.durationSeconds
      const done = timerRemaining !== undefined && timerRemaining <= 0
      return (
        <div className={`flex h-full w-full flex-col justify-center gap-6 px-20 text-slide-fg ${alignClass}`}>
          <h2 className="slide-h2">{slide.heading || 'Activity'}</h2>
          {slide.body && <p className="slide-body max-w-3xl whitespace-pre-wrap text-slide-muted">{slide.body}</p>}
          <p
            className={`slide-display tabular-nums ${done ? 'text-slide-accent' : ''}`}
            role="timer"
            aria-live="off"
            aria-label={done ? "Time's up" : `${formatDuration(remaining)} remaining`}
          >
            {done ? "Time's up" : formatDuration(remaining)}
          </p>
        </div>
      )
    }
  }
}

function Placeholder({ short }: { short?: boolean }): JSX.Element {
  return (
    <div
      className={`flex ${short ? 'h-2/3' : 'h-full'} w-full items-center justify-center rounded-lg border border-dashed border-slide-fg/30 text-slide-muted`}
    >
      No image
    </div>
  )
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
