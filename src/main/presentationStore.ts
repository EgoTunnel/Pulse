import { app, dialog } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { LibraryEntry, Presentation, Slide } from '@shared/types'
import { CONTENT_SLIDE_TYPES, INTERACTIVE_SLIDE_TYPES } from '@shared/types'
import { makeId } from '@shared/id'

const FILE_EXTENSION = 'pulse.json'
const KNOWN_SLIDE_TYPES = new Set<string>([...CONTENT_SLIDE_TYPES, ...INTERACTIVE_SLIDE_TYPES])

function sanitizeFileName(title: string): string {
  const trimmed = title.trim() || 'Untitled presentation'
  return trimmed.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)
}

function isDataImageUrl(v: unknown): v is string {
  return typeof v === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(v)
}

/**
 * Presentation files are meant to be shared instructor-to-instructor
 * ("share it with another instructor" per the portability requirement), so
 * they're untrusted input, not just this app's own output read back. A
 * hand-edited or malicious file shouldn't be able to crash the app when
 * opened, and an `imageDataUrl` that isn't an embedded data: URI is stripped
 * — otherwise opening someone else's file would silently make the renderer
 * fetch whatever URL they put there, leaking that the file was opened.
 */
function sanitizeSlide(raw: unknown): Slide | null {
  if (typeof raw !== 'object' || raw === null) return null
  const s = raw as Record<string, unknown>
  if (typeof s.id !== 'string' || typeof s.type !== 'string' || !KNOWN_SLIDE_TYPES.has(s.type)) return null
  const clone = { ...s }
  if ('imageDataUrl' in clone && !isDataImageUrl(clone.imageDataUrl)) delete clone.imageDataUrl
  return clone as unknown as Slide
}

function sanitizePresentation(raw: unknown): Presentation {
  if (typeof raw !== 'object' || raw === null) throw new Error("This doesn't look like a Pulse presentation file.")
  const p = raw as Record<string, unknown>
  if (typeof p.id !== 'string' || typeof p.title !== 'string' || !Array.isArray(p.slides)) {
    throw new Error("This doesn't look like a Pulse presentation file.")
  }
  const slides = p.slides.map(sanitizeSlide).filter((s): s is Slide => s !== null)
  return {
    id: p.id,
    title: p.title,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
    slides
  }
}

/**
 * Owns the local library index (a JSON file listing known presentations and
 * where they live on disk) plus reading/writing individual `.pulse.json`
 * presentation files. Presentations are plain files the instructor owns —
 * Pulse never requires a server round-trip to open or save one.
 */
export class PresentationStore {
  private libraryPath: string
  private defaultDir: string
  private library: LibraryEntry[] = []
  private loaded = false

  constructor() {
    const userData = app.getPath('userData')
    this.libraryPath = path.join(userData, 'library.json')
    this.defaultDir = path.join(app.getPath('documents'), 'Pulse Presentations')
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    try {
      const raw = await fs.readFile(this.libraryPath, 'utf-8')
      this.library = JSON.parse(raw)
    } catch {
      this.library = []
    }
    this.loaded = true
  }

  private async persistLibrary(): Promise<void> {
    await fs.mkdir(path.dirname(this.libraryPath), { recursive: true })
    await fs.writeFile(this.libraryPath, JSON.stringify(this.library, null, 2), 'utf-8')
  }

  async listLibrary(): Promise<LibraryEntry[]> {
    await this.ensureLoaded()
    // Drop entries whose file has disappeared (moved/deleted outside Pulse).
    const checked = await Promise.all(
      this.library.map(async (entry) => ({
        entry,
        exists: await fs
          .access(entry.filePath)
          .then(() => true)
          .catch(() => false)
      }))
    )
    this.library = checked.filter((c) => c.exists).map((c) => c.entry)
    await this.persistLibrary()
    return [...this.library].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }

  private async upsertLibraryEntry(entry: LibraryEntry): Promise<void> {
    await this.ensureLoaded()
    const idx = this.library.findIndex((e) => e.id === entry.id)
    if (idx >= 0) this.library[idx] = entry
    else this.library.unshift(entry)
    await this.persistLibrary()
  }

  async removeFromLibrary(id: string): Promise<void> {
    await this.ensureLoaded()
    this.library = this.library.filter((e) => e.id !== id)
    await this.persistLibrary()
  }

  async create(title: string): Promise<{ presentation: Presentation; filePath: string }> {
    const now = new Date().toISOString()
    const presentation: Presentation = {
      id: makeId(),
      title: title.trim() || 'Untitled presentation',
      createdAt: now,
      updatedAt: now,
      slides: []
    }
    await fs.mkdir(this.defaultDir, { recursive: true })
    const fileName = `${sanitizeFileName(presentation.title)}.${FILE_EXTENSION}`
    const filePath = await this.uniqueFilePath(path.join(this.defaultDir, fileName))
    await this.writeFile(filePath, presentation)
    await this.upsertLibraryEntry({
      id: presentation.id,
      title: presentation.title,
      filePath,
      updatedAt: presentation.updatedAt
    })
    return { presentation, filePath }
  }

  private async uniqueFilePath(candidate: string): Promise<string> {
    let attempt = candidate
    let n = 2
    const ext = `.${FILE_EXTENSION}`
    const base = candidate.slice(0, -ext.length)
    while (
      await fs
        .access(attempt)
        .then(() => true)
        .catch(() => false)
    ) {
      attempt = `${base} (${n})${ext}`
      n += 1
    }
    return attempt
  }

  private async writeFile(filePath: string, presentation: Presentation): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(presentation, null, 2), 'utf-8')
  }

  async save(filePath: string, presentation: Presentation): Promise<Presentation> {
    const updated: Presentation = { ...presentation, updatedAt: new Date().toISOString() }
    await this.writeFile(filePath, updated)
    await this.upsertLibraryEntry({
      id: updated.id,
      title: updated.title,
      filePath,
      updatedAt: updated.updatedAt
    })
    return updated
  }

  async saveAs(presentation: Presentation): Promise<{ presentation: Presentation; filePath: string } | null> {
    const result = await dialog.showSaveDialog({
      title: 'Save presentation',
      defaultPath: path.join(this.defaultDir, `${sanitizeFileName(presentation.title)}.${FILE_EXTENSION}`),
      filters: [{ name: 'Pulse presentation', extensions: [FILE_EXTENSION] }]
    })
    if (result.canceled || !result.filePath) return null
    const filePath = result.filePath.endsWith(`.${FILE_EXTENSION}`)
      ? result.filePath
      : `${result.filePath}.${FILE_EXTENSION}`
    const updated = await this.save(filePath, presentation)
    return { presentation: updated, filePath }
  }

  /**
   * "Import" — the picked file is presumed to live somewhere Pulse doesn't
   * control (a USB drive, a Downloads folder from an email attachment), so
   * it's copied into Pulse's own presentations folder before being added to
   * the library. Without this, the library entry would point straight at
   * the USB drive/Downloads file, and silently vanish from the library the
   * next time that drive isn't plugged in or that file gets cleaned up.
   */
  async openFromDisk(): Promise<{ presentation: Presentation; filePath: string } | null> {
    const result = await dialog.showOpenDialog({
      title: 'Import presentation',
      properties: ['openFile'],
      filters: [{ name: 'Pulse presentation', extensions: [FILE_EXTENSION, 'json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return this.openPath(result.filePaths[0], { importCopy: true })
  }

  async openPath(filePath: string, options: { importCopy?: boolean } = {}): Promise<{ presentation: Presentation; filePath: string }> {
    const raw = await fs.readFile(filePath, 'utf-8')
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error("This doesn't look like a Pulse presentation file.")
    }
    const presentation = sanitizePresentation(parsed)

    let finalPath = filePath
    const alreadyLocal = path.resolve(path.dirname(filePath)) === path.resolve(this.defaultDir)
    if (options.importCopy && !alreadyLocal) {
      await fs.mkdir(this.defaultDir, { recursive: true })
      finalPath = await this.uniqueFilePath(path.join(this.defaultDir, `${sanitizeFileName(presentation.title)}.${FILE_EXTENSION}`))
      await this.writeFile(finalPath, presentation)
    }

    await this.upsertLibraryEntry({
      id: presentation.id,
      title: presentation.title,
      filePath: finalPath,
      updatedAt: presentation.updatedAt
    })
    return { presentation, filePath: finalPath }
  }

  async openById(id: string): Promise<{ presentation: Presentation; filePath: string } | null> {
    await this.ensureLoaded()
    const entry = this.library.find((e) => e.id === id)
    if (!entry) return null
    try {
      return await this.openPath(entry.filePath)
    } catch {
      return null
    }
  }

  /**
   * "Export" — writes a standalone copy wherever the instructor picks (a USB
   * drive, a folder they're about to email) without touching the library or
   * the presentation's own saved location, so exporting never redirects
   * where the instructor's own working copy autosaves to.
   */
  async exportTo(presentation: Presentation): Promise<string | null> {
    const result = await dialog.showSaveDialog({
      title: 'Export presentation',
      defaultPath: `${sanitizeFileName(presentation.title)}.${FILE_EXTENSION}`,
      filters: [{ name: 'Pulse presentation', extensions: [FILE_EXTENSION] }]
    })
    if (result.canceled || !result.filePath) return null
    const filePath = result.filePath.endsWith(`.${FILE_EXTENSION}`) ? result.filePath : `${result.filePath}.${FILE_EXTENSION}`
    await this.writeFile(filePath, presentation)
    return filePath
  }

  async duplicate(id: string): Promise<{ presentation: Presentation; filePath: string } | null> {
    const found = await this.openById(id)
    if (!found) return null
    const now = new Date().toISOString()
    const copy: Presentation = {
      ...found.presentation,
      id: makeId(),
      title: `${found.presentation.title} (copy)`,
      createdAt: now,
      updatedAt: now
    }
    const filePath = await this.uniqueFilePath(
      path.join(path.dirname(found.filePath), `${sanitizeFileName(copy.title)}.${FILE_EXTENSION}`)
    )
    await this.writeFile(filePath, copy)
    await this.upsertLibraryEntry({ id: copy.id, title: copy.title, filePath, updatedAt: copy.updatedAt })
    return { presentation: copy, filePath }
  }
}
