import { useState } from 'react'
import type { StandingMessage } from '@shared/types'
import { MAX_NICKNAME_LENGTH } from '@shared/nicknames'

interface Props {
  standing: StandingMessage | null
  onRename: (nickname: string) => Promise<{ ok: true; nickname: string } | { ok: false; error: string }>
}

/** Shown during a competition: who you're playing as, and where you stand. */
export function PlayerBar({ standing, onRename }: Props): JSX.Element | null {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!standing) return null

  if (editing) {
    return (
      <form
        className="mb-4 rounded-2xl bg-white p-3 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          const result = await onRename(draft)
          setSaving(false)
          if (result.ok) {
            setEditing(false)
            setError(null)
          } else {
            setError(result.error)
          }
        }}
      >
        <label htmlFor="nickname" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Leaderboard nickname
        </label>
        <div className="flex gap-2">
          <input
            id="nickname"
            autoFocus
            value={draft}
            maxLength={MAX_NICKNAME_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            aria-describedby={error ? 'nickname-error' : 'nickname-hint'}
            className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 text-base outline-none focus:border-pulse-500"
          />
          <button type="submit" disabled={saving || draft.trim().length < 2} className="rounded-xl bg-pulse-600 px-4 text-sm font-semibold text-white disabled:opacity-40">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm text-slate-500">
            Cancel
          </button>
        </div>
        {error ? (
          <p id="nickname-error" role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        ) : (
          <p id="nickname-hint" className="mt-2 text-xs text-slate-500">
            Shown on the leaderboard. Skip your real name if you'd rather stay anonymous.
          </p>
        )}
      </form>
    )
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm" aria-live="polite">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{standing.nickname}</p>
        <p className="text-xs text-slate-500">
          #{standing.rank} of {standing.playerCount} · {standing.score.toLocaleString()} pts
        </p>
      </div>
      <button
        onClick={() => {
          setDraft(standing.nickname)
          setEditing(true)
        }}
        className="rounded-lg px-2 py-1 text-xs font-medium text-pulse-600"
      >
        Change name
      </button>
    </div>
  )
}
