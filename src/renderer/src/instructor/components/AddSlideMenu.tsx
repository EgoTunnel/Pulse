import { useEffect, useRef, useState } from 'react'
import { CONTENT_SLIDE_META, INTERACTIVE_SLIDE_META, SLIDE_TEMPLATES } from '@shared/slideMeta'
import type { Slide, SlideType } from '@shared/types'
import { useEditorStore } from '../store'

interface Props {
  afterId?: string | null
  label?: string
  fullWidth?: boolean
}

export function AddSlideMenu({ afterId = null, label = '+ Add slide', fullWidth }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const addSlide = useEditorStore((s) => s.addSlide)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pickType(type: SlideType): void {
    addSlide(type, afterId)
    setOpen(false)
  }

  function pickTemplate(templateId: string): void {
    const template = SLIDE_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    const patch = (template.type === 'likert' ? { statement: template.example } : { question: template.example }) as Partial<Slide>
    addSlide(template.type, afterId, patch)
    setOpen(false)
  }

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`${fullWidth ? 'w-full' : ''} rounded-lg border border-dashed border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-pulse-400 hover:text-white`}
      >
        {label}
      </button>
      {open && (
        <div role="menu" aria-label="Add a slide" className="absolute left-0 top-full z-20 mt-2 w-[560px] max-w-[90vw] rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Templates</h4>
              <div className="space-y-1">
                {SLIDE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    role="menuitem"
                    onClick={() => pickTemplate(t.id)}
                    className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-800"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 text-xs text-slate-500">{t.example}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Interactive</h4>
              <div className="grid grid-cols-2 gap-1">
                {INTERACTIVE_SLIDE_META.map((m) => (
                  <button
                    key={m.type}
                    role="menuitem"
                    onClick={() => pickType(m.type)}
                    title={m.description}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    <span className="text-pulse-400" aria-hidden="true">
                      {m.glyph}
                    </span>
                    {m.label}
                  </button>
                ))}
              </div>
              <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Content</h4>
              <div className="grid grid-cols-2 gap-1">
                {CONTENT_SLIDE_META.map((m) => (
                  <button
                    key={m.type}
                    role="menuitem"
                    onClick={() => pickType(m.type)}
                    title={m.description}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    <span className="text-slate-500" aria-hidden="true">
                      {m.glyph}
                    </span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
