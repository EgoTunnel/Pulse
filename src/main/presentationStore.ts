import { app, dialog } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { LibraryEntry, Presentation } from '@shared/types'
import { makeId } from '@shared/id'

const FILE_EXTENSION = 'pulse.json'

function sanitizeFileName(title: string): string {
  const trimmed = title.trim() || 'Untitled presentation'
  return trimmed.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)
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

  async openFromDisk(): Promise<{ presentation: Presentation; filePath: string } | null> {
    const result = await dialog.showOpenDialog({
      title: 'Open presentation',
      properties: ['openFile'],
      filters: [{ name: 'Pulse presentation', extensions: [FILE_EXTENSION, 'json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    return this.openPath(filePath)
  }

  async openPath(filePath: string): Promise<{ presentation: Presentation; filePath: string }> {
    const raw = await fs.readFile(filePath, 'utf-8')
    const presentation = JSON.parse(raw) as Presentation
    await this.upsertLibraryEntry({
      id: presentation.id,
      title: presentation.title,
      filePath,
      updatedAt: presentation.updatedAt
    })
    return { presentation, filePath }
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
