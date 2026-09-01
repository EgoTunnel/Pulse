import type { Slide, SessionStateMessage } from '@shared/types'
import { isInteractiveSlide } from '@shared/types'

interface Props {
  slide: Slide
  state: SessionStateMessage | null
  index: number
  total: number
  showJoinPanel: boolean
  onPrev: () => void
  onNext: () => void
  onToggleOpen: () => void
  onToggleReveal: () => void
  onReset: () => void
  onToggleJoinPanel: () => void
  onEnd: () => void
  onExit: () => void
}

export function ControlBar({
  slide,
  state,
  index,
  total,
  showJoinPanel,
  onPrev,
  onNext,
  onToggleOpen,
  onToggleReveal,
  onReset,
  onToggleJoinPanel,
  onEnd,
  onExit
}: Props): JSX.Element {
  const interactive = isInteractiveSlide(slide)

  return (
    <nav aria-label="Presentation controls" className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-slate-800 bg-slate-950/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <button onClick={onExit} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
          <span aria-hidden="true">✕</span> Exit presentation
        </button>
        <button
          onClick={onToggleJoinPanel}
          aria-expanded={showJoinPanel}
          aria-label={`${showJoinPanel ? 'Hide' : 'Show'} join info. Room code ${state?.roomCode ?? 'not ready'}, ${state?.participantCount ?? 0} students connected`}
          className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          {state?.roomCode ?? '···'} · {state?.participantCount ?? 0} connected
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={index === 0}
          aria-label="Previous slide"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-30"
        >
          <span aria-hidden="true">←</span> Prev
        </button>
        <span className="text-sm text-slate-500" aria-live="polite">
          Slide {index + 1} of {total}
        </span>
        <button
          onClick={onNext}
          disabled={index === total - 1}
          aria-label="Next slide"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-30"
        >
          Next <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {interactive && (
          <>
            <span className="text-sm text-slate-400" aria-live="polite">
              {state?.responseCount ?? 0} responses
            </span>
            <button
              onClick={onToggleOpen}
              aria-pressed={state?.responsesOpen ?? false}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                state?.responsesOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {state?.responsesOpen ? 'Responses open' : 'Responses closed'}
            </button>
            <button
              onClick={onToggleReveal}
              aria-pressed={state?.resultsRevealed ?? false}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                state?.resultsRevealed ? 'bg-pulse-500/20 text-pulse-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {state?.resultsRevealed ? 'Results shown' : 'Reveal results'}
            </button>
            <button onClick={onReset} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
              Reset responses
            </button>
          </>
        )}
        <button onClick={onEnd} className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30">
          End session
        </button>
      </div>
    </nav>
  )
}
