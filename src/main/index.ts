import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import type { Presentation } from '@shared/types'
import { PresentationStore } from './presentationStore'
import { LocalServer } from './server'

const store = new PresentationStore()
const localServer = new LocalServer()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0e1a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/index.html`)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
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
