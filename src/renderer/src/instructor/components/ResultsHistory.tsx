import { useCallback, useEffect, useState } from 'react'
import type { SavedSession, SavedSessionSummary } from '@shared/results'
import { resolveTheme, themeStyleVars } from '@shared/theme'
import { slideMetaFor } from '@shared/slideMeta'
import { ResultsView } from '../../shared/ResultsView'
import { questionText } from '../../shared/SlideStatic'
import { useEditorStore } from '../store'

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function duration(start: string, end: string): string {
  const mins = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`
}

/** Results an instructor chose to save from past sessions of this presentation. */
export function ResultsHistory(): JSX.Element | null {
  const presentation = useEditorStore((s) => s.presentation)
  const closeResults = useEditorStore((s) => s.closeResults)
  const [sessions, setSessions] = useState<SavedSessionSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<SavedSession | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!presentation) return
    const list = await window.pulse.results.list(presentation.id)
    setSessions(list)
    setSelectedId((current) => (current && list.some((s) => s.id === current) ? current : (list[0]?.id ?? null)))
  }, [presentation])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    setConfirmDelete(false)
    setMessage(null)
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    window.pulse.results.read(selectedId).then((d) => !cancelled && setDetail(d))
    return () => {
      cancelled = true
    }
  }, [selectedId])

  if (!presentation) return null
  const themeVars = themeStyleVars(resolveTheme(presentation.theme)) as React.CSSProperties

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-2.5">
        <button onClick={closeResults} className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
          ← Back to editor
        </button>
        <h1 className="text-sm font-medium text-white">Past results · {presentation.title}</h1>
      </header>

      {sessions && sessions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-slate-300">No saved results for this presentation yet.</p>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            When you end a live session, choose <strong className="text-slate-300">End &amp; save results</strong> to keep
            a copy here. Only totals and anonymous answers are saved — never who answered what.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <nav aria-label="Saved sessions" className="w-72 shrink-0 overflow-y-auto border-r border-slate-800 p-3">
            <ul className="space-y-2">
              {(sessions ?? []).map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    aria-current={s.id === selectedId}
                    className={`w-full rounded-lg border p-3 text-left ${
                      s.id === selectedId ? 'border-pulse-400 bg-pulse-500/10' : 'border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{when(s.startedAt)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {duration(s.startedAt, s.endedAt)} · {s.peakParticipants} {s.peakParticipants === 1 ? 'participant' : 'participants'} ·{' '}
                      {s.questionCount} {s.questionCount === 1 ? 'question' : 'questions'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-label="Session results" className="flex-1 overflow-y-auto p-6">
            {detail && (
              <>
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{when(detail.startedAt)}</h2>
                    <p className="text-sm text-slate-400">
                      {duration(detail.startedAt, detail.endedAt)} · peak {detail.peakParticipants}{' '}
                      {detail.peakParticipants === 1 ? 'participant' : 'participants'}
                      {detail.playerCount !== undefined && ` · ${detail.playerCount} competition ${detail.playerCount === 1 ? 'player' : 'players'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const path = await window.pulse.results.exportCsv(detail.id)
                        if (path) setMessage(`Exported to ${path}`)
                      }}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800"
                    >
                      Export CSV…
                    </button>
                    {confirmDelete ? (
                      <span className="flex items-center gap-2 text-sm text-slate-300">
                        Delete permanently?
                        <button
                          onClick={async () => {
                            await window.pulse.results.remove(detail.id)
                            setSelectedId(null)
                            await refresh()
                          }}
                          className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white"
                        >
                          Delete
                        </button>
                        <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-2 py-2 text-sm text-slate-400">
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(true)} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-300">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {message && (
                  <p role="status" className="mb-4 text-xs text-emerald-300">
                    ✓ {message}
                  </p>
                )}

                <ol className="space-y-6">
                  {detail.slides.map((r, i) => (
                    <li key={r.slideId} className="overflow-hidden rounded-xl border border-slate-800">
                      <div className="border-b border-slate-800 bg-slate-900 px-5 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {i + 1}. {slideMetaFor(r.slideType).label} · {r.responseCount} {r.responseCount === 1 ? 'response' : 'responses'}
                          {r.scored && ` · ${r.scored.correct} of ${r.scored.answered} correct (${r.scored.answered ? Math.round((r.scored.correct / r.scored.answered) * 100) : 0}%)`}
                        </p>
                        <h3 className="mt-1 text-base font-medium text-white">{questionText(r.slide)}</h3>
                      </div>
                      <div className="flex justify-center px-6 py-6" style={themeVars}>
                        <ResultsView slide={r.slide} data={r.data} responseCount={r.responseCount} revealed />
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
