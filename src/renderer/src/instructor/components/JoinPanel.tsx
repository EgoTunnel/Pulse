import type { JoinInfo } from '../../../../main/server'

interface Props {
  joinInfo: JoinInfo
  participantCount: number
  onTroubleshoot: () => void
}

export function JoinPanel({ joinInfo, participantCount, onTroubleshoot }: Props): JSX.Element {
  return (
    <div
      role="region"
      aria-label="Join session info"
      className="fixed right-6 top-6 z-30 w-72 rounded-2xl border border-slate-700 bg-slate-900/95 p-5 text-center shadow-2xl backdrop-blur"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Join the class</p>
      <p className="mb-3 text-3xl font-bold tracking-widest text-white">{joinInfo.roomCode}</p>
      {joinInfo.qrDataUrl ? (
        <img
          src={joinInfo.qrDataUrl}
          alt={`QR code to join the class. Room code ${joinInfo.roomCode}`}
          className="mx-auto mb-3 h-40 w-40 rounded-lg bg-white p-2"
        />
      ) : (
        <p className="mb-3 text-xs text-amber-400">Couldn't detect a network address for a QR code — students can still type the code.</p>
      )}
      {joinInfo.joinUrl && <p className="mb-3 break-all text-xs text-slate-400">{joinInfo.joinUrl}</p>}
      <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-2 text-sm text-slate-200" aria-live="polite">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        {participantCount} {participantCount === 1 ? 'student' : 'students'} connected
      </div>
      <button onClick={onTroubleshoot} className="mt-3 text-xs text-slate-500 underline hover:text-slate-300">
        Not seeing anyone join?
      </button>
    </div>
  )
}
