import { useMemo } from 'react'
import type { PublicSlide } from '@shared/types'
import { isInteractiveSlide } from '@shared/types'
import { normalizeRoomCode } from '@shared/id'
import { useStudentSession } from './useStudentSession'
import { JoinForm } from './components/JoinForm'
import { ResponseForm } from './components/ResponseForm'
import { WaitingScreen } from './components/WaitingScreen'

function codeFromUrl(): string {
  const pathMatch = window.location.pathname.match(/\/join\/([0-9]+)/)
  const digits = pathMatch?.[1] ?? new URLSearchParams(window.location.search).get('code') ?? ''
  return digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits
}

export function App(): JSX.Element {
  const session = useStudentSession()
  const initialCode = useMemo(codeFromUrl, [])

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
    return <WaitingScreen title="The session has ended" subtitle="Thanks for participating!" />
  }

  const slide = session.state?.slide
  if (!slide) {
    return <WaitingScreen title="You're in!" subtitle="Waiting for your instructor to start…" />
  }

  if (!isInteractiveSlide(slide)) {
    return <WaitingScreen title="Watching the presentation" subtitle="Your instructor is showing a slide." />
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-md">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-pulse-600">
          {session.state?.participantCount ?? 0} students · Room {session.state?.roomCode}
        </p>
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">{questionTextOf(slide)}</h1>
        <ResponseForm
          key={slide.id}
          slide={slide}
          responsesOpen={session.state?.responsesOpen ?? false}
          onSubmit={(value) => session.respond(slide.id, value)}
        />
      </div>
    </div>
  )
}

function questionTextOf(slide: PublicSlide): string {
  if ('question' in slide) return slide.question
  if ('statement' in slide) return slide.statement
  if ('prompt' in slide) return slide.prompt ?? ''
  return ''
}
