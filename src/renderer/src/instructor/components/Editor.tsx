import { useEffect } from 'react'
import { SlideThumbnail } from '../../shared/SlideThumbnail'
import { useEditorStore } from '../store'
import { SlideList } from './SlideList'
import { SlideInspector } from './SlideInspector'

export function Editor(): JSX.Element | null {
  const presentation = useEditorStore((s) => s.presentation)
  const selectedSlideId = useEditorStore((s) => s.selectedSlideId)
  const dirty = useEditorStore((s) => s.dirty)
  const saving = useEditorStore((s) => s.saving)
  const backToLibrary = useEditorStore((s) => s.backToLibrary)
  const setTitle = useEditorStore((s) => s.setTitle)
  const save = useEditorStore((s) => s.save)
  const enterPresent = useEditorStore((s) => s.enterPresent)

  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => save(), 1200)
    return () => clearTimeout(t)
  }, [dirty, save])

  if (!presentation) return null
  const selectedSlide = presentation.slides.find((s) => s.id === selectedSlideId) ?? presentation.slides[0]

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={backToLibrary} className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
            ← Library
          </button>
          <input
            value={presentation.title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg bg-transparent px-2 py-1 text-sm font-medium text-white outline-none focus:bg-slate-800"
          />
          <span className="text-xs text-slate-500">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}</span>
        </div>
        <button
          onClick={enterPresent}
          disabled={presentation.slides.length === 0}
          className="rounded-lg bg-pulse-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pulse-400 disabled:opacity-40"
        >
          Present ▸
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-slate-800">
          <SlideList />
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-950 p-8">
          {selectedSlide && (
            <div className="w-full max-w-4xl">
              <SlideThumbnail slide={selectedSlide} size="present" />
            </div>
          )}
        </div>

        <div className="w-80 shrink-0 overflow-y-auto border-l border-slate-800 p-4">
          {selectedSlide ? (
            <SlideInspector slide={selectedSlide} />
          ) : (
            <p className="text-sm text-slate-500">Add a slide to get started.</p>
          )}
        </div>
      </div>
    </div>
  )
}
