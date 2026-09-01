import { create } from 'zustand'
import type { LibraryEntry, Presentation, Slide, SlideType } from '@shared/types'
import { createSlide } from '@shared/slideFactory'

export type EditorView = 'library' | 'editor' | 'present'

interface EditorState {
  view: EditorView
  library: LibraryEntry[]
  presentation: Presentation | null
  filePath: string | null
  dirty: boolean
  saving: boolean
  selectedSlideId: string | null
  openError: string | null

  refreshLibrary: () => Promise<void>
  createPresentation: (title: string) => Promise<void>
  openFromDisk: () => Promise<void>
  openFromLibrary: (id: string) => Promise<void>
  removeFromLibrary: (id: string) => Promise<void>
  backToLibrary: () => void

  selectSlide: (id: string) => void
  addSlide: (type: SlideType, afterId?: string | null, patch?: Partial<Slide>) => void
  updateSlide: (id: string, patch: Partial<Slide>) => void
  removeSlide: (id: string) => void
  duplicateSlide: (id: string) => void
  moveSlide: (id: string, toIndex: number) => void
  setTitle: (title: string) => void

  save: () => Promise<void>
  saveAs: () => Promise<void>

  enterPresent: () => void
  exitPresent: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  view: 'library',
  library: [],
  presentation: null,
  filePath: null,
  dirty: false,
  saving: false,
  selectedSlideId: null,
  openError: null,

  refreshLibrary: async () => {
    const library = await window.pulse.library.list()
    set({ library })
  },

  createPresentation: async (title: string) => {
    const { presentation, filePath } = await window.pulse.presentation.create(title)
    set({ presentation, filePath, dirty: false, view: 'editor', selectedSlideId: presentation.slides[0]?.id ?? null })
  },

  openFromDisk: async () => {
    set({ openError: null })
    try {
      const result = await window.pulse.presentation.open()
      if (!result) return
      set({
        presentation: result.presentation,
        filePath: result.filePath,
        dirty: false,
        view: 'editor',
        selectedSlideId: result.presentation.slides[0]?.id ?? null
      })
    } catch (err) {
      set({ openError: err instanceof Error ? err.message : "Couldn't open that file." })
    }
  },

  openFromLibrary: async (id: string) => {
    set({ openError: null })
    const result = await window.pulse.presentation.openById(id)
    if (!result) {
      set({ openError: "Couldn't open that presentation — the file may be missing or damaged." })
      return
    }
    set({
      presentation: result.presentation,
      filePath: result.filePath,
      dirty: false,
      view: 'editor',
      selectedSlideId: result.presentation.slides[0]?.id ?? null
    })
  },

  removeFromLibrary: async (id: string) => {
    await window.pulse.library.remove(id)
    await get().refreshLibrary()
  },

  backToLibrary: () => {
    set({ view: 'library', presentation: null, filePath: null, selectedSlideId: null })
    get().refreshLibrary()
  },

  selectSlide: (id: string) => set({ selectedSlideId: id }),

  addSlide: (type: SlideType, afterId?: string | null, patch?: Partial<Slide>) => {
    const { presentation } = get()
    if (!presentation) return
    const slide = { ...createSlide(type), ...patch } as Slide
    const slides = [...presentation.slides]
    const insertAt = afterId ? slides.findIndex((s) => s.id === afterId) + 1 : slides.length
    slides.splice(insertAt, 0, slide)
    set({ presentation: { ...presentation, slides }, dirty: true, selectedSlideId: slide.id })
  },

  updateSlide: (id: string, patch: Partial<Slide>) => {
    const { presentation } = get()
    if (!presentation) return
    const slides = presentation.slides.map((s) => (s.id === id ? ({ ...s, ...patch } as Slide) : s))
    set({ presentation: { ...presentation, slides }, dirty: true })
  },

  removeSlide: (id: string) => {
    const { presentation, selectedSlideId } = get()
    if (!presentation) return
    const index = presentation.slides.findIndex((s) => s.id === id)
    const slides = presentation.slides.filter((s) => s.id !== id)
    const nextSelected =
      selectedSlideId === id ? slides[Math.min(index, slides.length - 1)]?.id ?? null : selectedSlideId
    set({ presentation: { ...presentation, slides }, dirty: true, selectedSlideId: nextSelected })
  },

  duplicateSlide: (id: string) => {
    const { presentation } = get()
    if (!presentation) return
    const index = presentation.slides.findIndex((s) => s.id === id)
    if (index === -1) return
    const original = presentation.slides[index]
    const copy: Slide = { ...original, id: `${original.id}-${Date.now()}` }
    const slides = [...presentation.slides]
    slides.splice(index + 1, 0, copy)
    set({ presentation: { ...presentation, slides }, dirty: true, selectedSlideId: copy.id })
  },

  moveSlide: (id: string, toIndex: number) => {
    const { presentation } = get()
    if (!presentation) return
    const slides = [...presentation.slides]
    const fromIndex = slides.findIndex((s) => s.id === id)
    if (fromIndex === -1) return
    const [moved] = slides.splice(fromIndex, 1)
    slides.splice(Math.max(0, Math.min(toIndex, slides.length)), 0, moved)
    set({ presentation: { ...presentation, slides }, dirty: true })
  },

  setTitle: (title: string) => {
    const { presentation } = get()
    if (!presentation) return
    set({ presentation: { ...presentation, title }, dirty: true })
  },

  save: async () => {
    const { presentation, filePath } = get()
    if (!presentation) return
    set({ saving: true })
    try {
      if (filePath) {
        const updated = await window.pulse.presentation.save(filePath, presentation)
        set({ presentation: updated, dirty: false })
      } else {
        await get().saveAs()
      }
    } finally {
      set({ saving: false })
    }
  },

  saveAs: async () => {
    const { presentation } = get()
    if (!presentation) return
    set({ saving: true })
    try {
      const result = await window.pulse.presentation.saveAs(presentation)
      if (result) set({ presentation: result.presentation, filePath: result.filePath, dirty: false })
    } finally {
      set({ saving: false })
    }
  },

  enterPresent: () => set({ view: 'present' }),
  exitPresent: () => set({ view: 'editor' })
}))
