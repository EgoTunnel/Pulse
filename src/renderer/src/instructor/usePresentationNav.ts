import { useCallback, useEffect, useState } from 'react'
import type { Slide } from '@shared/types'
import { bulletItems } from '../shared/SlideStatic'

interface PresentationNav {
  index: number
  /** Bullets currently visible on a reveal-one-by-one slide (undefined = show all). */
  visibleBullets: number | undefined
  /** Seconds left on an activity-timer slide (undefined on other slides). */
  timerRemaining: number | undefined
  timerRunning: boolean
  canNext: boolean
  canPrev: boolean
  next: () => void
  prev: () => void
  toggleTimer: () => void
  restartTimer: () => void
}

function revealCount(slide: Slide | undefined): number {
  return slide?.type === 'bullets' && slide.revealOneByOne ? bulletItems(slide.items).length : 0
}

/**
 * Slide navigation for Present Mode. "Next" steps through a reveal-one-by-one
 * bullet slide before moving on, and arriving at an activity-timer slide
 * starts its countdown — so the instructor drives everything with the same
 * arrow keys / clicker.
 */
export function usePresentationNav(slides: Slide[]): PresentationNav {
  const [index, setIndex] = useState(0)
  const [bulletStep, setBulletStep] = useState(0)
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null)
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const slide = slides[index]

  const enter = useCallback(
    (newIndex: number, forward: boolean) => {
      const target = slides[newIndex]
      setIndex(newIndex)
      // Moving forward starts a reveal slide empty; coming back to one shows
      // it complete, the way you left it.
      setBulletStep(forward ? 0 : revealCount(target))
      if (target?.type === 'timer') {
        setTimerEndsAt(Date.now() + target.durationSeconds * 1000)
        setPausedRemaining(null)
      } else {
        setTimerEndsAt(null)
        setPausedRemaining(null)
      }
    },
    [slides]
  )

  useEffect(() => {
    enter(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const running = slide?.type === 'timer' && pausedRemaining === null && timerEndsAt !== null
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [running])

  const steps = revealCount(slide)
  const hasMoreBullets = steps > 0 && bulletStep < steps
  const canNext = hasMoreBullets || index < slides.length - 1
  const canPrev = (steps > 0 && bulletStep > 0) || index > 0

  const next = useCallback(() => {
    if (hasMoreBullets) setBulletStep((s) => s + 1)
    else if (index < slides.length - 1) enter(index + 1, true)
  }, [hasMoreBullets, index, slides.length, enter])

  const prev = useCallback(() => {
    if (steps > 0 && bulletStep > 0) setBulletStep((s) => s - 1)
    else if (index > 0) enter(index - 1, false)
  }, [steps, bulletStep, index, enter])

  let timerRemaining: number | undefined
  if (slide?.type === 'timer') {
    timerRemaining = pausedRemaining ?? (timerEndsAt !== null ? Math.max(0, (timerEndsAt - now) / 1000) : slide.durationSeconds)
  }

  const toggleTimer = useCallback(() => {
    if (slide?.type !== 'timer') return
    if (pausedRemaining !== null) {
      setTimerEndsAt(Date.now() + pausedRemaining * 1000)
      setPausedRemaining(null)
    } else if (timerEndsAt !== null) {
      setPausedRemaining(Math.max(0, (timerEndsAt - Date.now()) / 1000))
    }
  }, [slide, pausedRemaining, timerEndsAt])

  const restartTimer = useCallback(() => {
    if (slide?.type !== 'timer') return
    setTimerEndsAt(Date.now() + slide.durationSeconds * 1000)
    setPausedRemaining(null)
    setNow(Date.now())
  }, [slide])

  return {
    index,
    visibleBullets: steps > 0 ? bulletStep : undefined,
    timerRemaining,
    timerRunning: running && (timerRemaining ?? 0) > 0,
    canNext,
    canPrev,
    next,
    prev,
    toggleTimer,
    restartTimer
  }
}
