import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import type { Presentation } from '@shared/types'
import { PresentationStore } from './presentationStore'
import { LocalServer } from './server'
import { Updater } from './updater'

// Last-resort safety net. The socket server and file-open paths validate
// their own untrusted input (see server.ts / validate.ts / presentationStore.ts)
// so this should never fire in practice — but a single unanticipated bug in
// a rarely-hit code path shouldn't be able to end a live class. Log and keep
// running rather than let Electron's default handling tear the app down.
process.on('uncaughtException', (err) => {
  console.error('[pulse] uncaught exception:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[pulse] unhandled rejection:', reason)
})

const store = new PresentationStore()
const localServer = new LocalServer()

let mainWindow: BrowserWindow | null = null
let updater: Updater | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0e1a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      // Standard Electron hardening: the renderer never gets direct Node
      // access, and the (small, deliberate) window.pulse API is the only
      // bridge to the main process — see src/preload/index.ts.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // This window only ever shows Pulse's own UI. Block any attempt to
  // navigate it elsewhere — belt-and-suspenders alongside the window-open
  // handler above, in case a future dependency or a malformed presentation
  // field ever tries to redirect the page itself.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isOwnDevServer = process.env.ELECTRON_RENDERER_URL && url.startsWith(process.env.ELECTRON_RENDERER_URL)
    const isOwnFile = url.startsWith('file://')
    if (!isOwnDevServer && !isOwnFile) event.preventDefault()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/index.html`)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  updater = new Updater(mainWindow)
  updater.start()
}

function registerIpcHandlers(): void {
  ipcMain.handle('pulse:library:list', () => store.listLibrary())
  ipcMain.handle('pulse:library:remove', (_e, id: string) => store.removeFromLibrary(id))

  ipcMain.handle('pulse:presentation:create', (_e, title: string) => store.create(title))
  ipcMain.handle('pulse:presentation:open', () => store.openFromDisk())
  ipcMain.handle('pulse:presentation:openById', (_e, id: string) => store.openById(id))
  ipcMain.handle('pulse:presentation:save', (_e, filePath: string, presentation: Presentation) =>
    store.save(filePath, presentation)
  )
  ipcMain.handle('pulse:presentation:saveAs', (_e, presentation: Presentation) => store.saveAs(presentation))
  ipcMain.handle('pulse:presentation:duplicate', (_e, id: string) => store.duplicate(id))

  ipcMain.handle('pulse:session:start', async (_e, presentation: Presentation) => localServer.start(presentation))
  ipcMain.handle('pulse:session:stop', () => localServer.stop())
  ipcMain.handle('pulse:session:status', () => localServer.getCurrentJoinInfo())

  ipcMain.handle('pulse:updater:status', () => updater?.getStatus() ?? { state: 'idle' })
  ipcMain.handle('pulse:updater:check', () => updater?.check())
  ipcMain.handle('pulse:updater:install', () => updater?.installNow())
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  await localServer.shutdown()
})
