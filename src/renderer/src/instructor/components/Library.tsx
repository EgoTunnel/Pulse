import { useEffect, useState } from 'react'
import { useEditorStore } from '../store'
import { TestConnection } from './TestConnection'

export function Library(): JSX.Element {
  const library = useEditorStore((s) => s.library)
  const refreshLibrary = useEditorStore((s) => s.refreshLibrary)
  const createPresentation = useEditorStore((s) => s.createPresentation)
  const openFromDisk = useEditorStore((s) => s.openFromDisk)
  const openFromLibrary = useEditorStore((s) => s.openFromLibrary)
  const removeFromLibrary = useEditorStore((s) => s.removeFromLibrary)
  const openError = useEditorStore((s) => s.openError)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)

  useEffect(() => {
    refreshLibrary()
  }, [refreshLibrary])

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-8 py-10">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pulse-500 text-lg font-bold text-white">
            P
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Pulse</h1>
            <p className="text-sm text-slate-400">Your classroom. Your data.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTestingConnection(true)}
            title="Check whether phones on this Wi-Fi can reach this computer, before you're in front of a class"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800"
          >
            Test connection
          </button>
          <button
            onClick={() => openFromDisk()}
            title="Bring in a presentation from a USB drive, email attachment, or anywhere else on this computer"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800"
          >
            Import…
          </button>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-pulse-500 px-4 py-2 text-sm font-medium text-white hover:bg-pulse-400"
          >
            New presentation
          </button>
        </div>
      </header>

      {testingConnection && <TestConnection onClose={() => setTestingConnection(false)} />}

      {openError && (
        <p role="alert" className="mb-6 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {openError}
        </p>
      )}

      {creating && (
        <form
          className="mb-8 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            await createPresentation(newTitle.trim() || 'Untitled presentation')
            setCreating(false)
            setNewTitle('')
          }}
        >
          <label htmlFor="new-presentation-title" className="sr-only">
            Presentation title
          </label>
          <input
            id="new-presentation-title"
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Presentation title"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-pulse-400"
          />
          <button type="submit" className="rounded-lg bg-pulse-500 px-4 py-2 text-sm font-medium text-white">
            Create
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
        </form>
      )}

      {library.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 text-center">
          <p className="text-slate-400">No presentations yet.</p>
          <p className="mt-1 text-sm text-slate-500">Create your first presentation to get started.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {library.map((entry) => (
            <li
              key={entry.id}
              className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 p-4 transition hover:border-pulse-500"
            >
              <button
                onClick={() => openFromLibrary(entry.id)}
                aria-label={`Open ${entry.title}`}
                className="absolute inset-0 z-0 text-left"
              />
              <button
                onClick={() => removeFromLibrary(entry.id)}
                aria-label={`Remove ${entry.title} from library`}
                className="absolute right-2 top-2 z-10 hidden rounded-md bg-slate-950/70 px-2 py-1 text-xs text-slate-300 hover:text-red-400 group-hover:block group-focus-within:block"
              >
                Remove
              </button>
              <p className="pointer-events-none truncate font-medium text-white">{entry.title}</p>
              <p className="pointer-events-none mt-1 text-xs text-slate-400">{new Date(entry.updatedAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
