import { dialog } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { SavedSession, SavedSessionSummary } from '@shared/results'
import { summarize } from '@shared/results'
import { resultsToCsv } from '@shared/resultsCsv'

const EXTENSION = '.pulse-results.json'
const RESULT_KINDS = new Set(['choice', 'boolean', 'rating', 'likert', 'words', 'text', 'ranking', 'numeric', 'questions'])

function safeName(s: string): string {
  return (s.trim() || 'Untitled').replace(/[\\/:*?"<>|]/g, '-').slice(0, 60)
}

function stamp(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}`
}

/**
 * Results files can be copied around like presentations, so a file read
 * back is untrusted: check the shape before handing it to the renderer.
 * (Text is rendered through React, so it's escaped; this is about not
 * crashing on — or charting — a malformed file.)
 */
function parse(raw: string): SavedSession | null {
  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof v !== 'object' || v === null) return null
  const s = v as Record<string, unknown>
  if (s.kind !== 'pulse-results' || typeof s.id !== 'string' || typeof s.presentationId !== 'string') return null
  if (typeof s.startedAt !== 'string' || typeof s.endedAt !== 'string' || !Array.isArray(s.slides)) return null
  const slides = s.slides.filter((r): r is SavedSession['slides'][number] => {
    if (typeof r !== 'object' || r === null) return false
    const rr = r as Record<string, unknown>
    const data = rr.data as Record<string, unknown> | undefined
    return (
      typeof rr.slideId === 'string' &&
      typeof rr.responseCount === 'number' &&
      typeof rr.slide === 'object' &&
      rr.slide !== null &&
      typeof data === 'object' &&
      data !== null &&
      RESULT_KINDS.has(String(data.kind))
    )
  })
  return {
    kind: 'pulse-results',
    version: 1,
    id: s.id,
    presentationId: s.presentationId,
    presentationTitle: typeof s.presentationTitle === 'string' ? s.presentationTitle : 'Untitled',
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    peakParticipants: typeof s.peakParticipants === 'number' ? s.peakParticipants : 0,
    playerCount: typeof s.playerCount === 'number' ? s.playerCount : undefined,
    slides
  }
}

/** Saved session results, one JSON file each, in a Results folder alongside the presentations (on the drive itself in portable mode). */
export class ResultsStore {
  constructor(private dir: string) {}

  async save(session: SavedSession): Promise<SavedSessionSummary> {
    await fs.mkdir(this.dir, { recursive: true })
    const base = path.join(this.dir, `${safeName(session.presentationTitle)} — ${stamp(session.startedAt)}`)
    let filePath = `${base}${EXTENSION}`
    for (let n = 2; await exists(filePath); n++) filePath = `${base} (${n})${EXTENSION}`
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8')
    return summarize(session)
  }

  private async readAll(): Promise<{ filePath: string; session: SavedSession }[]> {
    let names: string[]
    try {
      names = await fs.readdir(this.dir)
    } catch {
      return []
    }
    const out: { filePath: string; session: SavedSession }[] = []
    for (const name of names) {
      if (!name.endsWith(EXTENSION)) continue
      const filePath = path.join(this.dir, name)
      try {
        const session = parse(await fs.readFile(filePath, 'utf-8'))
        if (session) out.push({ filePath, session })
      } catch {
        // Unreadable file — skip it rather than failing the whole list.
      }
    }
    return out
  }

  async list(presentationId?: string): Promise<SavedSessionSummary[]> {
    return (await this.readAll())
      .filter((r) => !presentationId || r.session.presentationId === presentationId)
      .map((r) => summarize(r.session))
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  }

  async read(id: string): Promise<SavedSession | null> {
    return (await this.readAll()).find((r) => r.session.id === id)?.session ?? null
  }

  async remove(id: string): Promise<void> {
    const found = (await this.readAll()).find((r) => r.session.id === id)
    if (found) await fs.unlink(found.filePath)
  }

  async exportCsv(id: string): Promise<string | null> {
    const session = await this.read(id)
    if (!session) return null
    const result = await dialog.showSaveDialog({
      title: 'Export results as CSV',
      defaultPath: `${safeName(session.presentationTitle)} results ${stamp(session.startedAt)}.csv`,
      filters: [{ name: 'CSV (spreadsheet)', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return null
    const filePath = result.filePath.endsWith('.csv') ? result.filePath : `${result.filePath}.csv`
    await fs.writeFile(filePath, resultsToCsv(session), 'utf-8')
    return filePath
  }
}

async function exists(p: string): Promise<boolean> {
  return fs
    .access(p)
    .then(() => true)
    .catch(() => false)
}
