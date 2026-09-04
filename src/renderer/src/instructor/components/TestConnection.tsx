import { useEffect, useMemo, useRef, useState } from 'react'
import type { Presentation } from '@shared/types'
import { makeId } from '@shared/id'
import { usePresenterSession } from '../usePresenterSession'
import { ConnectionHelp } from './ConnectionHelp'

/** How long to wait during a deliberate test before showing troubleshooting — shorter than the in-class hint, since testing ahead of time means there's no pressure to wait it out. */
const TEST_HELP_DELAY_MS = 20_000

export function TestConnection({ onClose }: { onClose: () => void }): JSX.Element {
  const testPresentation = useMemo<Presentation>(() => {
    const now = new Date().toISOString()
    return {
      id: makeId(),
      title: 'Connection test',
      createdAt: now,
      updatedAt: now,
      slides: [{ id: makeId(), type: 'title', title: 'Connection test' }]
    }
  }, [])

  const session = usePresenterSession(testPresentation)
  const [showHelp, setShowHelp] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (session.connectivity.anyDeviceReached) return
    const t = setTimeout(() => setShowHelp(true), TEST_HELP_DELAY_MS)
    return () => clearTimeout(t)
  }, [session.connectivity.anyDeviceReached])

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const succeeded = session.connectivity.anyDeviceReached

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-connection-title"
        className="max-h-full w-[36rem] max-w-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p id="test-connection-title" className="text-lg font-semibold text-white">
              Test your connection
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Scan this with your own phone — on the same Wi-Fi you'll use in class — to check it can reach this
              computer before you're in front of students.
            </p>
          </div>
        </div>

        {session.error && <p className="mb-4 text-sm text-red-400">{session.error}</p>}

        <div className="mb-4 flex flex-col items-center gap-3 rounded-xl bg-white/5 p-5">
          {session.joinInfo?.qrDataUrl ? (
            <img
              src={session.joinInfo.qrDataUrl}
              alt={`QR code to test the connection. Room code ${session.joinInfo.roomCode}`}
              className="h-44 w-44 rounded-lg bg-white p-2"
            />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center text-sm text-slate-500">Starting…</div>
          )}
          {session.joinInfo && <p className="text-2xl font-bold tracking-widest text-white">{session.joinInfo.roomCode}</p>}

          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
            {succeeded ? (
              <span className="font-medium text-emerald-400">✓ Success — a device reached this session</span>
            ) : (
              <span className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
                Waiting for your phone…
              </span>
            )}
          </div>
        </div>

        {showHelp && !succeeded && (
          <div className="mb-4">
            <p className="mb-3 text-sm font-medium text-amber-300">Nothing's connected yet.</p>
            <ConnectionHelp showTestTip={false} />
          </div>
        )}

        <div className="flex justify-end">
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-lg bg-pulse-500 px-4 py-2 text-sm font-medium text-white hover:bg-pulse-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
