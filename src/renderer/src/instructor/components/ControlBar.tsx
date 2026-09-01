import type { Slide, SessionStateMessage } from '@shared/types'
import { isInteractiveSlide } from '@shared/types'

interface Props {
  slide: Slide
  state: SessionStateMessage | null
  index: number
  total: number
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
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-slate-800 bg-slate-950/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <button onClick={onExit} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
          ✕ Exit
        </button>
        <button onClick={onToggleJoinPanel} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
          {state?.roomCode ?? '···'} · {state?.participantCount ?? 0} connected
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-30"
        >
          ← Prev
        </button>
        <span className="text-sm text-slate-500">
          {index + 1} / {total}
        </span>
        <button
          onClick={onNext}
          disabled={index === total - 1}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-30"
        >
          Next →
        </button>
      </div>

      <div className="flex items-center gap-2">
        {interactive && (
          <>
            <span className="text-sm text-slate-400">{state?.responseCount ?? 0} responses</span>
            <button
              onClick={onToggleOpen}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                state?.responsesOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {state?.responsesOpen ? 'Responses open' : 'Responses closed'}
            </button>
            <button
              onClick={onToggleReveal}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                state?.resultsRevealed ? 'bg-pulse-500/20 text-pulse-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {state?.resultsRevealed ? 'Results shown' : 'Reveal results'}
            </button>
            <button onClick={onReset} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
              Reset
            </button>
          </>
        )}
        <button onClick={onEnd} className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30">
          End session
        </button>
      </div>
    </div>
  )
}
