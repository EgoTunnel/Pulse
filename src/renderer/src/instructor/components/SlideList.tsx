import { useState } from 'react'
import { isInteractiveSlide } from '@shared/types'
import { slideMetaFor } from '@shared/slideMeta'
import { SlideThumbnail } from '../../shared/SlideThumbnail'
import { useEditorStore } from '../store'
import { AddSlideMenu } from './AddSlideMenu'

export function SlideList(): JSX.Element {
  const presentation = useEditorStore((s) => s.presentation)
  const selectedSlideId = useEditorStore((s) => s.selectedSlideId)
  const selectSlide = useEditorStore((s) => s.selectSlide)
  const removeSlide = useEditorStore((s) => s.removeSlide)
  const duplicateSlide = useEditorStore((s) => s.duplicateSlide)
  const moveSlide = useEditorStore((s) => s.moveSlide)
  const [dragId, setDragId] = useState<string | null>(null)

  if (!presentation) return <></>

  return (
    <ul aria-label="Slides" className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {presentation.slides.map((slide, index) => {
        const label = `Slide ${index + 1}: ${slideMetaFor(slide.type).label}${isInteractiveSlide(slide) ? ' (interactive)' : ''}`
        return (
          <li
            key={slide.id}
            draggable
            onDragStart={() => setDragId(slide.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId && dragId !== slide.id) moveSlide(dragId, index)
              setDragId(null)
            }}
            className={`group relative rounded-lg border p-1.5 transition ${
              selectedSlideId === slide.id ? 'border-pulse-400 bg-pulse-500/10' : 'border-transparent hover:border-slate-700'
            }`}
          >
            <button onClick={() => selectSlide(slide.id)} aria-current={selectedSlideId === slide.id} className="block w-full text-left">
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span className="text-xs font-medium text-slate-500" aria-hidden="true">
                  {index + 1}
                </span>
                {isInteractiveSlide(slide) && (
                  <span className="rounded bg-pulse-500/20 px-1.5 py-0.5 text-[10px] font-medium text-pulse-300" aria-hidden="true">
                    Q
                  </span>
                )}
              </div>
              <span className="sr-only">{label}</span>
              <SlideThumbnail slide={slide} />
            </button>
            <div className="absolute right-1 top-6 hidden flex-col gap-1 group-hover:flex group-focus-within:flex">
              <button
                onClick={() => moveSlide(slide.id, index - 1)}
                disabled={index === 0}
                aria-label={`Move slide ${index + 1} up`}
                className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-white disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => moveSlide(slide.id, index + 1)}
                disabled={index === presentation.slides.length - 1}
                aria-label={`Move slide ${index + 1} down`}
                className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-white disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => duplicateSlide(slide.id)}
                aria-label={`Duplicate slide ${index + 1}`}
                className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-white"
              >
                ⧉
              </button>
              {presentation.slides.length > 1 && (
                <button
                  onClick={() => removeSlide(slide.id)}
                  aria-label={`Delete slide ${index + 1}`}
                  className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        )
      })}
      <li>
        <AddSlideMenu fullWidth />
      </li>
    </ul>
  )
}
