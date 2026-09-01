import { useEffect, useState } from 'react'
import type { UpdaterStatus } from '@shared/types'

/**
 * Deliberately quiet: this only ever renders something when there's an
 * update ready to install. Checking, downloading, "already up to date",
 * and errors (flaky Wi-Fi, no releases published yet) all stay invisible —
 * an instructor mid-prep shouldn't have to think about update plumbing.
 */
export function UpdateBanner(): JSX.Element | null {
  const [status, setStatus] = useState<UpdaterStatus>({ state: 'idle' })

  useEffect(() => {
    window.pulse.updater.status().then(setStatus)
    return window.pulse.updater.onStatus(setStatus)
  }, [])

  if (status.state !== 'ready') return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur">
      <span className="text-sm text-slate-200">Pulse {status.version} is ready.</span>
      <button
        onClick={() => window.pulse.updater.install()}
        className="rounded-lg bg-pulse-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-pulse-400"
      >
        Restart to update
      </button>
    </div>
  )
}
