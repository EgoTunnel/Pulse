import { useEffect, useRef, useState } from 'react'
import { isInteractiveSlide } from '@shared/types'
import { SlideStatic } from '../../shared/SlideStatic'
import { ResultsView } from '../../shared/ResultsView'
import { resolveTheme, themeStyleVars } from '@shared/theme'
import { useEditorStore } from '../store'
import { usePresenterSession } from '../usePresenterSession'
import { usePresentationNav } from '../usePresentationNav'
import { JoinPanel } from './JoinPanel'
import { ControlBar } from './ControlBar'
import { ConnectionHelp } from './ConnectionHelp'

/** How long to wait after the session becomes joinable before proactively suggesting Wi-Fi troubleshooting if nothing has connected. */
const NO_CONNECTION_HINT_DELAY_MS = 45_000

export function PresentMode(): JSX.Element | null {
  const presentation = useEditorStore((s) => s.presentation)
  const exitPresent = useEditorStore((s) => s.exitPresent)
  const slides = presentation?.slides ?? []
  const nav = usePresentationNav(slides)
  const index = nav.index
  const [showJoinPanel, setShowJoinPanel] = useState(true)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const cancelEndRef = useRef<HTMLButtonElement>(null)
  const closeTroubleshootingRef = useRef<HTMLButtonElement>(null)

  const session = usePresenterSession(presentation!)

  useEffect(() => {
    if (!session.joinInfo) return
    const t = setTimeout(() => {
      if (!session.connectivity.anyDeviceReached) setShowTroubleshooting(true)
    }, NO_CONNECTION_HINT_DELAY_MS)
    return () => clearTimeout(t)
  }, [session.joinInfo, session.connectivity.anyDeviceReached])

  const slide = slides[index]

  useEffect(() => {
    if (slide) session.setSlide(slide.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide?.id])

  useEffect(() => {
    if (confirmEnd) cancelEndRef.current?.focus()
  }, [confirmEnd])

  useEffect(() => {
    if (showTroubleshooting) closeTroubleshootingRef.current?.focus()
  }, [showTroubleshooting])

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        if (confirmEnd) setConfirmEnd(false)
        else if (showTroubleshooting) setShowTroubleshooting(false)
        else exitPresent()
        return
      }
      if (confirmEnd || showTroubleshooting) return
      // Buttons handle their own Space/Enter; don't double-fire navigation.
      if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
      const onTimer = slide?.type === 'timer'
      if (onTimer && e.key === ' ') {
        e.preventDefault()
        nav.toggleTimer()
        return
      }
      if (onTimer && (e.key === 'r' || e.key === 'R')) {
        nav.restartTimer()
        return
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        nav.next()
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') nav.prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, slide, exitPresent, confirmEnd, showTroubleshooting])

  if (!presentation || !slide) return null

  const stageStyle = themeStyleVars(resolveTheme(presentation.theme, slide.style)) as React.CSSProperties

  const interactive = isInteractiveSlide(slide)
  const showResults = interactive && session.results && session.results.slideId === slide.id && (session.state?.responseCount ?? 0) >= 0

  return (
    <div className="relative flex h-full w-full flex-col transition-[background] duration-500" style={stageStyle}>
      {session.error && (
        <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">
          {session.error}
        </div>
      )}

      {showJoinPanel && session.joinInfo && (
        <JoinPanel
          joinInfo={session.joinInfo}
          participantCount={session.state?.participantCount ?? 0}
          onTroubleshoot={() => setShowTroubleshooting(true)}
        />
      )}

      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-10 pb-20 pt-10">
        <div className="flex w-full flex-1 items-center justify-center">
          <SlideStatic slide={slide} visibleBullets={nav.visibleBullets} timerRemaining={nav.timerRemaining} />
        </div>
        {showResults && session.results && (
          <div className="flex w-full flex-col items-center justify-center pb-4 pt-6" aria-live="polite">
            <ResultsView
              slide={slide}
              data={session.results.data}
              responseCount={session.state?.responseCount ?? session.results.responseCount}
              revealed={session.state?.resultsRevealed ?? false}
              onDismissQuestion={slide.type === 'qna' ? session.dismissQuestion : undefined}
              onMarkQuestionAddressed={slide.type === 'qna' ? session.markQuestionAddressed : undefined}
              onRemoveResponse={
                slide.type === 'shortAnswer' || slide.type === 'openResponse' ? session.removeResponse : undefined
              }
              onBanWord={slide.type === 'wordCloud' ? session.banWord : undefined}
            />
          </div>
        )}
      </div>

      <ControlBar
        slide={slide}
        state={session.state}
        index={index}
        total={slides.length}
        canPrev={nav.canPrev}
        canNext={nav.canNext}
        timerRunning={slide.type === 'timer' ? nav.timerRunning : undefined}
        onToggleTimer={nav.toggleTimer}
        onRestartTimer={nav.restartTimer}
        showJoinPanel={showJoinPanel}
        onPrev={nav.prev}
        onNext={nav.next}
        onToggleOpen={() => (session.state?.responsesOpen ? session.closeResponses() : session.openResponses())}
        onToggleReveal={() => (session.state?.resultsRevealed ? session.hideResults() : session.revealResults())}
        onReset={() => session.resetResponses()}
        onToggleJoinPanel={() => setShowJoinPanel((v) => !v)}
        onEnd={() => setConfirmEnd(true)}
        onExit={exitPresent}
      />

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-session-title"
            aria-describedby="end-session-description"
            className="w-96 rounded-xl border border-slate-700 bg-slate-900 p-6 text-center"
          >
            <p id="end-session-title" className="mb-1 text-lg font-semibold text-white">
              End this session?
            </p>
            <p id="end-session-description" className="mb-5 text-sm text-slate-400">
              Students will be disconnected and all participation for this session will be discarded.
            </p>
            <div className="flex justify-center gap-3">
              <button
                ref={cancelEndRef}
                onClick={() => setConfirmEnd(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  session.endSession()
                  exitPresent()
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}

      {showTroubleshooting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="troubleshoot-title"
            className="w-[32rem] max-w-full rounded-xl border border-slate-700 bg-slate-900 p-6"
          >
            <p id="troubleshoot-title" className="mb-3 text-lg font-semibold text-white">
              No devices have connected
            </p>
            <ConnectionHelp />
            <div className="mt-5 flex justify-end">
              <button
                ref={closeTroubleshootingRef}
                onClick={() => setShowTroubleshooting(false)}
                className="rounded-lg bg-pulse-500 px-4 py-2 text-sm font-medium text-white hover:bg-pulse-400"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
