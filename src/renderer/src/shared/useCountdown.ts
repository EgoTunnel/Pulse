import { useEffect, useState } from 'react'

/**
 * Turns the server's "closes in N ms" into a live seconds-remaining value.
 * The deadline is anchored to this device's own clock at the moment each
 * update arrives, so a phone whose clock is minutes off still counts down
 * correctly. Pass the state object too so a repeated identical value (e.g.
 * a reopened question) still re-anchors.
 */
export function useCountdown(msRemaining: number | null | undefined, anchor: unknown): number | null {
  const [deadline, setDeadline] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    setDeadline(msRemaining === null || msRemaining === undefined ? null : Date.now() + msRemaining)
    setNow(Date.now())
  }, [msRemaining, anchor])

  useEffect(() => {
    if (deadline === null) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [deadline])

  if (deadline === null) return null
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}
