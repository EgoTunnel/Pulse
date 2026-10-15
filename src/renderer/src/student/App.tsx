import { useMemo } from 'react'
import type { FeedbackMessage, PublicSlide, StandingMessage } from '@shared/types'
import { isInteractiveSlide } from '@shared/types'
import { normalizeRoomCode } from '@shared/id'
import { useStudentSession } from './useStudentSession'
import { useCountdown } from '../shared/useCountdown'
import { JoinForm } from './components/JoinForm'
import { ResponseForm } from './components/ResponseForm'
import { WaitingScreen } from './components/WaitingScreen'
import { PlayerBar } from './components/PlayerBar'

function codeFromUrl(): string {
  const pathMatch = window.location.pathname.match(/\/join\/([0-9]+)/)
  const digits = pathMatch?.[1] ?? new URLSearchParams(window.location.search).get('code') ?? ''
  return digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits
}

export function App(): JSX.Element {
  const session = useStudentSession()
  const initialCode = useMemo(codeFromUrl, [])
  const secondsLeft = useCountdown(session.state?.responsesCloseInMs, session.state)

  if (session.status === 'idle' || session.status === 'joining' || session.status === 'error') {
    return (
      <JoinForm
        initialCode={initialCode}
        error={session.status === 'error' ? session.error : null}
        onJoin={(code) => session.join(normalizeRoomCode(code))}
      />
    )
  }

  if (session.status === 'ended') {
    return (
      <WaitingScreen
        title="The session has ended"
        subtitle={
          session.standing
            ? `You finished #${session.standing.rank} of ${session.standing.playerCount} with ${session.standing.score.toLocaleString()} points. Thanks for playing!`
            : 'Thanks for participating!'
        }
      />
    )
  }

  const state = session.state
  const slide = state?.slide
  const competition = !!state?.competition
  const reconnecting = !session.connected && (
    <p role="status" className="mb-4 rounded-xl bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800">
      Connection lost — reconnecting…
    </p>
  )
  const playerBar = competition && <PlayerBar standing={session.standing} onRename={session.setNickname} />

  if (!slide || !isInteractiveSlide(slide)) {
    const onLeaderboard = slide?.type === 'leaderboard' && session.standing
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-8">
        <div className="mx-auto max-w-md">
          {reconnecting}
          {playerBar}
          {onLeaderboard && session.standing ? (
            <StandingCard standing={session.standing} />
          ) : (
            <WaitingScreen
              compact
              title={slide ? 'Watching the presentation' : "You're in!"}
              subtitle={slide ? 'Your instructor is showing a slide.' : 'Waiting for your instructor to start…'}
            />
          )}
        </div>
      </main>
    )
  }

  const feedback = session.feedback?.slideId === slide.id ? session.feedback : null
  const timeUp = secondsLeft === 0
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-md">
        {reconnecting}
        {playerBar}
        <div className="mb-4 flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-wide text-pulse-600" aria-live="polite">
          <span>
            {state?.participantCount ?? 0} students · Room {state?.roomCode}
          </span>
          {state?.responsesOpen && secondsLeft !== null && (
            <span
              role="timer"
              aria-label={`${secondsLeft} seconds left`}
              className={`rounded-full px-2.5 py-1 normal-case tabular-nums ${secondsLeft <= 5 ? 'bg-red-100 text-red-700' : 'bg-pulse-100 text-pulse-700'}`}
            >
              ⏱ {secondsLeft}s
            </span>
          )}
        </div>
        <h1 id="question-heading" className="mb-6 text-center text-2xl font-bold text-slate-900">
          {questionTextOf(slide)}
        </h1>
        {feedback && <FeedbackCard feedback={feedback} standing={session.standing} />}
        <ResponseForm
          key={slide.id}
          slide={slide}
          responsesOpen={(state?.responsesOpen ?? false) && !timeUp}
          scored={state?.scored ?? false}
          revealed={!!feedback}
          onSubmit={(value) => session.respond(slide.id, value)}
        />
      </div>
    </main>
  )
}

function FeedbackCard({ feedback, standing }: { feedback: FeedbackMessage; standing: StandingMessage | null }): JSX.Element {
  return (
    <div
      role="status"
      className={`mb-6 rounded-2xl px-5 py-4 text-center ${feedback.correct ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}
    >
      <p className="text-2xl font-bold">{feedback.correct ? `✓ Correct! +${feedback.points.toLocaleString()}` : '✗ Not quite'}</p>
      {standing && (
        <p className="mt-1 text-sm opacity-90">
          You're #{standing.rank} of {standing.playerCount} · {standing.score.toLocaleString()} pts
        </p>
      )}
    </div>
  )
}

function StandingCard({ standing }: { standing: StandingMessage }): JSX.Element {
  return (
    <div className="mt-10 rounded-3xl bg-pulse-600 px-6 py-10 text-center text-white shadow-lg" role="status">
      <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Your rank</p>
      <p className="my-2 text-6xl font-bold tabular-nums">#{standing.rank}</p>
      <p className="text-base opacity-90">
        of {standing.playerCount} {standing.playerCount === 1 ? 'player' : 'players'} · {standing.score.toLocaleString()} points
      </p>
    </div>
  )
}

function questionTextOf(slide: PublicSlide): string {
  if ('question' in slide) return slide.question
  if ('statement' in slide) return slide.statement
  if ('prompt' in slide) return slide.prompt ?? ''
  return ''
}
