import { useState } from 'react'
import { isInteractiveSlide } from '@shared/types'
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
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {presentation.slides.map((slide, index) => (
        <div
          key={slide.id}
          draggable
          onDragStart={() => setDragId(slide.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragId && dragId !== slide.id) moveSlide(dragId, index)
            setDragId(null)
          }}
          onClick={() => selectSlide(slide.id)}
          className={`group relative cursor-pointer rounded-lg border p-1.5 transition ${
            selectedSlideId === slide.id ? 'border-pulse-400 bg-pulse-500/10' : 'border-transparent hover:border-slate-700'
          }`}
        >
          <div className="mb-1 flex items-center justify-between px-0.5">
            <span className="text-xs font-medium text-slate-500">{index + 1}</span>
            {isInteractiveSlide(slide) && <span className="rounded bg-pulse-500/20 px-1.5 py-0.5 text-[10px] font-medium text-pulse-300">Q</span>}
          </div>
          <SlideThumbnail slide={slide} />
          <div className="absolute right-1 top-6 hidden flex-col gap-1 group-hover:flex">
            <button
              onClick={(e) => {
                e.stopPropagation()
                duplicateSlide(slide.id)
              }}
              className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-white"
              title="Duplicate"
            >
              ⧉
            </button>
            {presentation.slides.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeSlide(slide.id)
                }}
                className="rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-red-400"
                title="Delete"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
      <AddSlideMenu fullWidth />
    </div>
  )
}
