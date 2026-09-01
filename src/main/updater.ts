import { app, type BrowserWindow } from 'electron'
import electronUpdaterPkg from 'electron-updater'
import type { UpdaterStatus } from '@shared/types'

// electron-updater is CommonJS and doesn't declare proper ESM named exports —
// `import { autoUpdater } from 'electron-updater'` typechecks (its .d.ts
// claims a named export) but throws at runtime under Node's ESM loader
// ("Named export 'autoUpdater' not found"). Importing the default and
// destructuring is the reliable way to pull a named value out of a CJS
// module here.
const { autoUpdater } = electronUpdaterPkg

const RECHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

/**
 * Wraps electron-updater so the instructor never has to think about it
 * (vision doc: "keeping Pulse current should be easy"). Checks happen
 * quietly in the background; the renderer only hears about it once there's
 * something worth telling them — an update is ready to install. Anything
 * else (no update, network hiccup, checking) is logged, not surfaced, so a
 * flaky hotel Wi-Fi never interrupts a class with an update dialog.
 *
 * Only meaningful in a packaged build: there's no publish metadata to check
 * against in dev, and unsigned macOS builds can't self-update at all (see
 * README) — both cases just log and stay quiet.
 */
export class Updater {
  private mainWindow: BrowserWindow
  private status: UpdaterStatus = { state: 'idle' }

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.on('checking-for-update', () => this.setStatus({ state: 'checking' }))
    autoUpdater.on('update-available', (info) => this.setStatus({ state: 'available', version: info.version }))
    autoUpdater.on('update-not-available', () => this.setStatus({ state: 'idle' }))
    autoUpdater.on('download-progress', (progress) =>
      this.setStatus({ state: 'downloading', percent: Math.round(progress.percent) })
    )
    autoUpdater.on('update-downloaded', (info) => this.setStatus({ state: 'ready', version: info.version }))
    autoUpdater.on('error', (err) => {
      console.error('[pulse] auto-updater error:', err)
      this.setStatus({ state: 'error', message: err.message })
    })
  }

  private setStatus(status: UpdaterStatus): void {
    this.status = status
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('pulse:updater:status', status)
    }
  }

  getStatus(): UpdaterStatus {
    return this.status
  }

  start(): void {
    if (!app.isPackaged) return
    this.check()
    setInterval(() => this.check(), RECHECK_INTERVAL_MS)
  }

  check(): void {
    if (!app.isPackaged) return
    autoUpdater.checkForUpdates().catch((err) => console.error('[pulse] update check failed:', err))
  }

  installNow(): void {
    if (this.status.state !== 'ready') return
    autoUpdater.quitAndInstall()
  }
}
